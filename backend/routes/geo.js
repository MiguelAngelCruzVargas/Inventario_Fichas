import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

// Helper: shared config for geocoding
const getGeocoderConfig = () => {
  const cc = (process.env.GEOCODER_COUNTRYCODES || 'mx').trim();
  const viewbox = (process.env.GEOCODER_VIEWBOX || '').trim(); // 'minLon,minLat,maxLon,maxLat'
  const userAgent = process.env.GEOCODER_USER_AGENT || 'InventarioFichas/1.0 (contacto: soporte@localhost)';
  return { cc, viewbox, userAgent };
};

const buildSearchUrl = (query, limit = 5, cc = 'mx', viewbox = '') => {
  const params = new URLSearchParams({
    format: 'json',
    addressdetails: '1',
    limit: String(limit),
    q: query
  });
  if (cc) params.set('countrycodes', cc);
  if (viewbox) {
    params.set('viewbox', viewbox);
    params.set('bounded', '1');
  }
  return `https://nominatim.openstreetmap.org/search?${params.toString()}`;
};

// Simple proxy to Nominatim with proper headers and CORS-safe browser usage
// GET /api/geo/search?q=QUERY&limit=5
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    const limit = parseInt(req.query.limit, 10) || 5;
    if (!q) return res.status(400).json({ success: false, error: 'Parámetro q requerido' });

    const { cc, viewbox, userAgent } = getGeocoderConfig();
    const buildUrl = (query) => buildSearchUrl(query, limit, cc, viewbox);

    // Attempt 1: original query
    const tryFetch = async (url) => {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Accept-Language': 'es-MX,es;q=0.9',
          'User-Agent': userAgent
        },
        timeout: 10000
      });
      if (!response.ok) {
        const text = await response.text();
        console.warn('Geocode upstream error:', response.status, text.slice(0, 200));
        return null;
      }
      return response.json();
    };

    const normalize = (s) => {
      let out = s
        .replace(/\bCP\s*\d{4,6}\b/gi, '') // quita código postal
        .replace(/\bC\.P\.?\s*\d{4,6}\b/gi, '')
        .replace(/\bCiudad\s+/gi, '') // "Ciudad Loma Bonita" -> "Loma Bonita"
        .replace(/\s{2,}/g, ' ') // espacios dobles
        .trim();
      // Asegura país si trabajamos sesgados a MX
      if (/^mx$/i.test(cc) && !/mexic|méxic/i.test(out)) out = `${out}, México`;
      return out;
    };

    const urlsToTry = [buildUrl(q), buildUrl(normalize(q))];
    const results = [];
    for (const url of urlsToTry) {
      try {
        const data = await tryFetch(url);
        if (Array.isArray(data) && data.length) {
          // Une resultados evitando duplicados por place_id
          const seen = new Set(results.map(r => r.place_id));
          for (const r of data) {
            if (!seen.has(r.place_id)) {
              results.push(r);
              seen.add(r.place_id);
            }
          }
        }
        if (results.length >= limit) break;
      } catch (e) {
        // Continúa con el siguiente intento
      }
    }

    return res.json({ success: true, results });
  } catch (e) {
    console.error('Error en /geo/search:', e);
    return res.status(500).json({ success: false, error: 'Fallo al geocodificar' });
  }
});

// Reverse geocoding: GET /api/geo/reverse?lat=..&lon=..
router.get('/reverse', async (req, res) => {
  try {
    const lat = (req.query.lat || '').toString().trim();
    const lon = (req.query.lon || '').toString().trim();
    if (!lat || !lon) return res.status(400).json({ success: false, error: 'Parámetros lat y lon requeridos' });

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
    const userAgent = process.env.GEOCODER_USER_AGENT || 'InventarioFichas/1.0 (contacto: soporte@localhost)';
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'es',
        'User-Agent': userAgent
      },
      timeout: 10000
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn('Reverse geocode upstream error:', response.status, text.slice(0, 200));
      return res.status(502).json({ success: false, error: 'Error del servicio de geocodificación' });
    }

    const data = await response.json();
    return res.json({ success: true, result: data });
  } catch (e) {
    console.error('Error en /geo/reverse:', e);
    return res.status(500).json({ success: false, error: 'Fallo al geocodificar' });
  }
});

export default router;

// New: Resolve Google Maps URLs or raw links to coordinates
// GET /api/geo/resolve?url=<google maps url>
router.get('/resolve', async (req, res) => {
  try {
    const raw = (req.query.url || '').toString().trim();
    if (!raw) return res.status(400).json({ success: false, error: 'Parámetro url requerido' });

    // Only allow Google Maps style links for safety
    const allowed = /(https?:\/\/)?(maps\.app\.goo\.gl|goo\.gl\/maps|www\.google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)\//i;
    if (!allowed.test(raw)) {
      return res.status(400).json({ success: false, error: 'URL no soportada' });
    }

    // Follow redirects to get final URL
    const resp = await fetch(raw, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; InventarioFichas/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 10000
    });
    const finalUrl = resp.url || raw;

    // Try to extract coordinates
    // Pattern: .../@lat,lon, or data param containing @lat,lon
    const mAt = finalUrl.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
    if (mAt) {
      const lat = parseFloat(mAt[1]);
      const lon = parseFloat(mAt[2]);
      return res.json({ success: true, lat, lon, source: 'url-at' });
    }

    // Pattern: ?q=lat,lon or ?query=lat,lon
    try {
      const u = new URL(finalUrl);
      const q = u.searchParams.get('query') || u.searchParams.get('q');
      if (q) {
        const mQ = q.match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
        if (mQ) {
          const lat = parseFloat(mQ[1]);
          const lon = parseFloat(mQ[2]);
          return res.json({ success: true, lat, lon, source: 'url-query' });
        }
      }
      // Try to extract a human address from /maps/place/<text>
      let placeText = '';
      const placeMatch = u.pathname.match(/\/maps\/place\/([^/]+)/);
      if (placeMatch) {
        placeText = decodeURIComponent(placeMatch[1]).replace(/\+/g, ' ');
      }
      const dirMatch = u.pathname.match(/\/maps\/dir\/.*?\/([^/]+)$/);
      if (!placeText && dirMatch) {
        placeText = decodeURIComponent(dirMatch[1]).replace(/\+/g, ' ');
      }

      if (placeText) {
        // Geocode this text via Nominatim
        const { cc, viewbox, userAgent } = getGeocoderConfig();
        const searchUrl = buildSearchUrl(placeText, 1, cc, viewbox);
        const gRes = await fetch(searchUrl, {
          headers: {
            'Accept': 'application/json',
            'Accept-Language': 'es',
            'User-Agent': userAgent
          },
          timeout: 10000
        });
        if (gRes.ok) {
          const arr = await gRes.json();
          if (Array.isArray(arr) && arr.length) {
            const r = arr[0];
            return res.json({ success: true, lat: parseFloat(r.lat), lon: parseFloat(r.lon), display_name: r.display_name, source: 'geocoded-place' });
          }
        }
      }
    } catch (e) {
      // ignore and fallthrough
    }

    return res.status(404).json({ success: false, error: 'No se pudieron obtener coordenadas de la URL' });
  } catch (e) {
    console.error('Error en /geo/resolve:', e);
    return res.status(500).json({ success: false, error: 'Fallo al resolver la URL' });
  }
});
