import "@mdi/font/css/materialdesignicons.css";
import "vuetify/styles";
import "@/styles/app.css";
import { createVuetify } from "vuetify";
import { createVueI18nAdapter } from "vuetify/locale/adapters/vue-i18n";
import { useI18n } from "vue-i18n";
import { i18n } from "@/i18n";
import Color from "vuetify/directives/color";

// Colors follow the Device Management design reference
export default createVuetify({
  // The adapter is typed for an untyped i18n instance
  locale: { adapter: createVueI18nAdapter({ i18n: i18n as never, useI18n }) },
  theme: {
    defaultTheme: "light",
    themes: {
      light: {
        colors: {
          primary: "#1D4ED8",
          secondary: "#4A5260",
          success: "#17663A",
          warning: "#B45309",
          error: "#B42318",
          info: "#1D4ED8",
          background: "#F4F5F7",
          surface: "#FFFFFF",
          "on-background": "#1B1F24",
          "on-surface": "#1B1F24",
          // Segmented controls, neutral panels
          "surface-soft": "#F1F3F6",
          "input-border": "#CBD1D9",
        },
        variables: {
          "border-color": "#E3E6EA",
          "border-opacity": 1,
          "medium-emphasis-opacity": 0.78,
          // Tonal chips/alerts and active nav items get a light tint, e.g. primary -> #EEF3FF
          "activated-opacity": 0.08,
        },
      },
      dark: {
        colors: {
          primary: "#7AA2F7",
          secondary: "#A9B1BD",
          success: "#5CC48A",
          warning: "#F0A35B",
          error: "#F27A6E",
          info: "#7AA2F7",
          background: "#111418",
          surface: "#1B1F24",
          "surface-soft": "#262B33",
          "input-border": "#3A414B",
        },
        variables: {
          "activated-opacity": 0.16,
        },
      },
    },
  },
  defaults: {
    VBtn: { variant: "tonal", rounded: "lg" },
    VCard: {
      rounded: "lg",
      flat: true,
      border: true,
      background: "#FFFFFF",
    },
    VAlert: { rounded: "lg", variant: "tonal" },
    VTextField: { variant: "outlined", density: "comfortable", rounded: "lg" },
    VSelect: { variant: "outlined", density: "comfortable", rounded: "lg" },
    VAutocomplete: {
      variant: "outlined",
      density: "comfortable",
      rounded: "lg",
    },
  },
});
