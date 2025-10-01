import { EventEmitter } from 'events';

const bus = new EventEmitter();
// Many concurrent connections are fine; adjust as needed
bus.setMaxListeners(2000);

export default bus;
