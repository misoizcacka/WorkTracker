import { Stack } from 'expo-router';

export default function ReportsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="employee-hours-report" />
      <Stack.Screen name="daily-activity-report" />
      <Stack.Screen name="payroll-report" />
      <Stack.Screen name="project-labor-report" />
      <Stack.Screen name="daily-detailed-report/[worker_id]" />
    </Stack>
  );
}
