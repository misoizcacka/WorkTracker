import BackgroundLocationModule from './src/BackgroundLocationModule';

export function start(
  workerId: string,
  assignmentId: string,
  companyId: string,
  supabaseUrl: string,
  supabasePublishableKey: string,
  accessToken: string
): Promise<void> {
    return BackgroundLocationModule.start(
      workerId,
      assignmentId,
      companyId,
      supabaseUrl,
      supabasePublishableKey,
      accessToken
    );
}

export function stop(): Promise<void> {
    return BackgroundLocationModule.stop();
}