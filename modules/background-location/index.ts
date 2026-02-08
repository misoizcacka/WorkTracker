import BackgroundLocationModule from './src/BackgroundLocationModule';

export function start(): Promise<void> { // Temporarily disable native module calls
    return BackgroundLocationModule.start();
}

export function stop(): Promise<void> { // Temporarily disable native module calls
    return BackgroundLocationModule.stop();
}