-- Supabase SQL Editor'da çalıştırın.
--
-- "Destructive operations" uyarısı: DROP POLICY satırları yüzünden çıkar.
-- Bu komutlar TABLO veya SATIR silmez; sadece aşağıdaki İSİMLERDEKİ eski politikaları
-- kaldırıp aynı isimle yeniden oluşturmak içindir (script'i tekrar çalıştırınca çakışma olmasın).
-- Bu isimlerde özel politikanız yoksa onaylamak güvenlidir.
--
-- İlk kez politika ekliyorsanız ve uyarı istemiyorsanız: aşağıdaki tüm
-- "drop policy if exists ..." satırlarını silip sadece ALTER + CREATE bölümlerini çalıştırabilirsiniz.
--
-- Amaç: Giriş yapan kullanıcının kendi profiles ve user_preferences satırını
-- okuyup yazabilmesi. RLS açıkken politika yoksa istekler reddedilir.
--
-- İsteğe bağlı — "permission denied for table" alırsanız (nadir):
-- grant select, insert, update on public.profiles to authenticated;
-- grant select, insert, update on public.user_preferences to authenticated;
--
-- Upsert için user_id benzersiz olmalı (yoksa uygulama upsert hata verir):
-- create unique index if not exists user_preferences_user_id_key on public.user_preferences (user_id);

-- ---------- profiles ----------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------- user_preferences ----------
alter table public.user_preferences enable row level security;

drop policy if exists "user_preferences_select_own" on public.user_preferences;
drop policy if exists "user_preferences_insert_own" on public.user_preferences;
drop policy if exists "user_preferences_update_own" on public.user_preferences;

create policy "user_preferences_select_own"
  on public.user_preferences for select
  to authenticated
  using (user_id = auth.uid());

create policy "user_preferences_insert_own"
  on public.user_preferences for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "user_preferences_update_own"
  on public.user_preferences for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
