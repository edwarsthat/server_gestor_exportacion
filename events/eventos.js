import { EventEmitter } from 'events';

export const procesoEventEmitter = new EventEmitter();

// Emitter exclusivo para el stream SSE del dashboard/SmartTV
export const dashboardEventEmitter = new EventEmitter();
