## **Sprint 1 — Testing & QA foundation**

Syfte:

- Bygga trygghet i projektet
- Lära dig hur du säkrar funktionalitet med tester
- Förstå vilka delar som faktiskt fungerar och vad som är osäkert

Innehåll:

- ~~Lägg till tester för upload-flödet~~
- ~~Testa PDF parsing och text extraktion~~
- ~~Testa API error handling~~
- ~~Utöka testning av chat-flödet~~
- ~~Försäkra dig om att chunking-logiken är stabil~~
- ~~Sätt upp en enkel test-checklista för framtida ändringar~~

Lärandemål:

- Vitest
- teststruktur
- regression prevention
- kvalitetssäkring

Status:

- Avslutad
- 34 befintliga tester plus nya edge-case-tester täcker upload, parsing, API-fel, chat, chunking och dokumentlivscykel

---

## **Sprint 2 — App reliability & document management**

Syfte:

- Gör appen mer stabil och användbar i praktiken
- Fokusera på dokumentflödet, inte bara själva chatbotten

Innehåll:

- Hantera flera dokument
- Lägga till dokumentlista / metadata
- Möjlighet att uppdatera eller ta bort dokument
- Bättre felhantering för fel PDF:er
- Förbättra indexeringsflödet
- Säkerställa att databasen inte blir ohanterlig

Lärandemål:

- backend logik
- datamodell
- dokumentlivscykel
- resilient API-design

Status:

- Avslutad
- Flera dokument, metadata, rename, delete, statusflöde, PDF-validering och storleksgräns är implementerade och testade

---

## **Sprint 3 — RAG quality & AI evaluation**

Syfte:

- Förbättra kvaliteten på svaren
- Lär dig hur retrieval faktiskt påverkar resultatet

Innehåll:

- Testa olika chunk sizes
- Testa overlap
- Justera match_threshold och match_count
- Jämför olika prompts
- Utvärdera om svaren faktiskt bygger på dokumentet
- Lägg till enkel utvärderingsmodell för svarkvalitet

Lärandemål:

- AI quality
- RAG tuning
- prompt design
- evaluation

Status:

- Påbörjad och jämförbar
- Metrics, fixtures, tre konfigurationer och aggregering finns i `evaluation/`
- Nästa steg inom Sprint 3 är att köra experimenten med riktiga Supabase/OpenAI-resultat och spara resultatrapporten

---

## **Sprint 4 — Accessibility & UX**

Syfte:

- Gör appen mer professionell och användbar
- Förbered dig för verkliga användare och krav

Innehåll:

- Keyboard navigation
- Fokuslägen
- Labels och semantisk HTML
- Kontrastkontroll
- Screen reader-testning
- Tydligare statusmeddelanden i UI:n

Lärandemål:

- WCAG
- tillgänglighet
- användbarhet
- bättre UX

Status:

- Medvetet uppskjuten
- Görs efter Sprint 3 och före produktionsarbete endast om UX blir blockerande

---

## **Sprint 5 — Security, scaling & production readiness**

Syfte:

- Ta projektet från prototype till mer robust produkt

Innehåll:

- Säkerhetskontroller för uppladdningar
- Filstorlek och filtyper
- Användarskillnad och dokumentåtkomst
- Loggning och observability
- CI/CD
- Miljövariabler och säkra konfigurationer
- Bättre monitoring och felrapportering

Lärandemål:

- backend security
- production architecture
- devops
- system design

Status:

- Påbörjad
- Upload-endpointen kontrollerar filtyp, filändelse, filstorlek och PDF-signatur
- CI kör install, lint, tester och production build via `.github/workflows/ci.yml`
- Supabase Auth med e-post/lösenord, cookie-session och login/logout finns implementerat
- API-routes kräver inloggning och filtrerar dokument på `user_id`
- RLS-migration finns i `supabase/migrations/20260925100000_document_ownership.sql`
- Ownership-migrationen är applicerad på remote-databasen
- Kvar: verifiera login och dokumentisolering med två testkonton, konfigurera `NEXT_PUBLIC_SUPABASE_ANON_KEY`, rate limiting, central loggning/monitoring och verifierad produktionsdeploy

---

## **Rekommenderad ordning för dig**

Din valda ordning är:

1. Sprint 1 — Testing & QA — avslutad
2. Sprint 2 — App reliability & document management — avslutad
3. Sprint 3 — RAG quality & AI evaluation — slutför riktiga experiment
4. Sprint 5 — Security & production readiness — fortsätt med åtkomstkontroll och observability

Sprint 4 hoppas över tills vidare.

Detta ger dig en logisk progression:

- först stabilitet,
- sedan funktionalitet,
- sedan AI-kvalitet,
- sedan användbarhet,
- sedan produktionsförberedelse.

---

## **Kort version av din plan**

Du kan tänka så här:

- Klart: stabila tester och robust dokumentflöde
- Nu: kör och dokumentera RAG-experiment
- Påbörjat: upload-säkerhet, CI och användarautentisering
- Kvar: verifiera dokumentisolering med riktiga användare, rate limiting, loggning, monitoring och produktionsdeploy
- Senare: återkom till tillgänglighet och UX
