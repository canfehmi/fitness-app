import * as Google from 'expo-auth-session/providers/google'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from './supabase'

WebBrowser.maybeCompleteAuthSession()

export const GOOGLE_CLIENT_ID = '643936512818-tl30r0v15119o000mhtadc21in4b1got.apps.googleusercontent.com'
export const GOOGLE_ANDROID_CLIENT_ID = '643936512818-jpf2imjisvhrhauoh0gv62u8264760la.apps.googleusercontent.com'