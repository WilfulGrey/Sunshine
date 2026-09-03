/*
  # [ZNEUTRALIZOWANA] Add user profiles data

  Oryginalna treść insertowała 4 profile z gen_random_uuid() — na świeżym
  projekcie to natychmiastowy FK violation (profiles.id REFERENCES auth.users),
  a wiersze były duchami z błędną domeną @mamamia.com. Na prodzie migracja
  została już dawno zaaplikowana; treść zastąpiona no-opem, żeby żaden przyszły
  replay migracji na świeżym środowisku się na niej nie wywalił.

  Środowiska stawiamy ze zrzutu schematu prod (pg_dump --schema-only), nie
  z replayu migracji — patrz CLAUDE.md, sekcja workflow.
*/

SELECT 1; -- no-op
