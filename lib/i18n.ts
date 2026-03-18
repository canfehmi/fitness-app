import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import * as Localization from 'expo-localization'
import tr from '../locales/tr.json'
import en from '../locales/en.json'

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  lng: Localization.getLocales()[0]?.languageCode ?? 'tr',
  fallbackLng: 'tr',
  resources: {
    tr: { translation: tr },
    en: { translation: en },
  },
  interpolation: {
    escapeValue: false,
  },
})

export default i18n