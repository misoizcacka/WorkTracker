import { Slot } from "expo-router";
import { I18nProvider } from "../../I18nContext";

export default function RootLayout() {
  return (
    <I18nProvider>
      <Slot />
    </I18nProvider>
  );
}
