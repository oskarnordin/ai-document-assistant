PROJEKTÖVERBLICK – Document & Knowledge Assistant

Datum: 2026-09-24

1. Vad är detta projekt?

Detta projekt är en enkel AI-app som låter användaren ladda upp en PDF och sedan ställa frågor om innehållet i filen.

Tanken är att appen ska kunna svara med hjälp av dokumentet, inte bara med generella AI-fakta från internet eller från modellens träningsdata.

Det här är ett typiskt RAG-projekt (Retrieval-Augmented Generation):
- dokumentet läses in,
- texten delas upp i mindre delar,
- varje del omvandlas till vektorer (embedding),
- när användaren ställer en fråga hittar systemet de mest relevanta delarna,
- AI:n får dessa delar som kontext och svarar utifrån dem.

Det är en bra grund för ett dokumentbaserat chatbot-system.

2. Vad har gjorts hittills?

2.1 Grundläggande webapp

Det finns en Next.js-applikation byggd med React och Tailwind.

Det som är gjort:
- en sida där användaren kan ladda upp en PDF,
- en chat-gränssnitt där användaren kan skriva frågor,
- statusmeddelanden för uppladdning och fel,
- UI-komponenter för att hålla appen enkel och ren.

Varför det behövs:
- utan ett användargränssnitt är det svårt att testa appen i verkligheten,
- det gör det lätt att se om uppladdningen och svaren fungerar.

2.2 PDF-hantering

Appen kan ta emot en PDF-fil via ett API-endpoint.

Det som händer:
- PDF:n laddas upp,
- text extraheras från dokumentet,
- texten delas upp i mindre delar (chunks),
- varje textdel konverteras till en embedding,
- text och embedding sparas i databasen.

Varför det är gjort:
- AI:n kan inte bearbeta ett stort dokument som en enda lång textbit,
- små textdelar gör det lättare att hitta exakt relevant information när användaren ställer frågor.

2.3 Chunking/logik

Det finns en funktion som delar text i mindre bitar.

Det finns även tester för denna funktion.

Det som testas:
- tom text ska ge tom lista,
- ord ska inte kapas mitt i ett ord,
- chunking ska kunna ha överlappning mellan bitarna.

Varför det är viktigt:
- dålig chunking kan göra att viktiga delar av texten försvinner,
- det kan också ge dåliga svar om rätt information inte hittas.

2.4 AI-embeddings och semantisk sökning

När användaren ställer en fråga:
- frågan omvandlas också till en embedding,
- den jämförs med dokumentets text-embeddings,
- systemet hämtar de mest relevanta textdelarna.

Detta använder Supabase med pgvector.

Varför det behövs:
- det gör att systemet kan hitta text som är semantiskt lik den fråga användaren ställde,
- inte bara text som matchar ord exakt.

2.5 Chat-flöde med kontext

Chat-endpointet:
- tar emot meddelanden från användaren,
- hämtar den senaste användarfrågan,
- letar upp liknande textsegment i databasen,
- skickar dessa segment som kontext till OpenAI-modellen,
- ger svar baserat på dokumentet.

Det finns även ett verktygsflöde för sammanfattningar.

Varför det är gjort:
- AI:n ska svara utifrån dokumentet, inte gissa eller tala om saker som inte finns där,
- det minskar hallucinering och gör svar mer sannolika.

2.6 Databas och vektorlagring

Projektet är kopplat till Supabase och använder PostgreSQL med pgvector.

Det som lagras:
- text från dokumentet,
- embedding för varje textbit.

Varför det är viktigt:
- det gör att sökning kan ske snabbt och effektivt,
- det ger möjlighet att bygga större dokumentbaserade lösningar senare.

2.7 Testning finns på en del av logiken

Det finns ett test för chunking i projektet.

Det visar att det finns en grund för kvalitetskontroll.

Varför detta är bra:
- man kan upptäcka buggar tidigt,
- man kan modifiera logik med större trygghet.

3. Hur projektet fungerar i praktiken

Det går ungefär så här:
1. Användaren laddar upp en PDF.
2. PDF:n läses och text extraheras.
3. Texten delas upp i mindre bitar.
4. Embeddings skapas för varje bit.
5. Text och vektorer lagras i databasen.
6. Användaren skriver en fråga.
7. Frågan konverteras till embedding.
8. Systemet hämtar de mest relevanta delarna från dokumentet.
9. AI:n svarar utifrån den hittade kontexten.

Det är en komplett flöde för ett “chatta med ditt dokument”-system.

4. Det som redan fungerar bra

- Enkel och tydlig användarupplevelse
- PDF-uppladdning fungerar som grundfunktion
- AI-svar baseras på dokumentets innehåll
- Vektorliknande sökning finns på plats
- Struktur i projektet är tydlig och överskådlig
- Next.js + API-routes + frontend är väl kopplade

5. Vad som fortfarande är osäkert eller behöver förbättras

Det här är de saker som behöver extra fokus:

- Det finns ingen tydlig användarhantering eller autentisering ännu.
- Det finns ingen tydlig säkerhetsmodell för filer, användare och API-anrop.
- Det saknas ofta bättre felhantering för edge cases, till exempel trasiga PDF:er eller väldigt stora dokument.
- Chunks kan vara för stora eller för små beroende på dokumenttyp.
- Det finns ingen tydlig strategi för att rensa gamla dokument eller uppdatera befintligt index.
- Det finns inget tydligt sätt att hantera flera dokument samtidigt på ett robust sätt.
- Det finns ingen riktigt lösning för att mäta kvalitet på svaren.
- Det finns ingen större testning av hela flödet från upload till AI-svar.

6. Förbättringsförslag

Det här är de viktigaste sakerna att fokusera på framöver:

6.1 Förbättra dokumenthantering
- stöd för flera dokument samtidigt,
- bättre namn på dokument och metadata,
- möjlighet att ta bort eller uppdatera dokument i databasen,
- tydlig separat index per dokument eller användare.

6.2 Bättre kvalitet i chunks
- justera chunk-size och overlap baserat på dokumenttyp,
- testa hur olika PDF:er påverkas,
- läsa och behålla kontext bättre i långa dokument.

6.3 Säkerhet och kontroll
- kontrollera filtyp och filstorlek,
- validera input på servern,
- begränsa API-användning,
- undvik att spara känsliga dokument utan korrekt accesskontroll.

6.4 Mätning av svarskvalitet
- testa om svaren faktiskt använder dokumentet,
- mäta hur ofta AI:n svarar med “information saknas” när den faktiskt borde göra det,
- utvärdera relevans och precision i svaren.

6.5 UX och användbarhet
- visa användaren vilka dokument som är indexerade,
- ge bättre meddelanden om varför inget svar hittades,
- lägga till laddningsstatus, förlopp och felmeddelande som är lättare att förstå.

6.6 Produktion och underhåll
- loggning av fel och token-användning,
- miljövariabler ska vara tydliga och säkra,
- sätta upp en enkel CI/CD-flöde,
- lägga in mer testning innan produktion.

7. Vad man ska vara uppmärksam på

Det här är viktiga saker att hålla koll på:

- AI kan hallucinate om det inte får tillräcklig kontext.
- Om chunking är dåligt kan relevanta svar missas.
- Vektorsökning är inte alltid perfekt. Det kan hitta liknande text men inte exakt rätt information.
- Alla frågor behöver inte vara lösbara från dokumentet. Systemet måste hantera detta tydligt.
- Stora PDF:er kan bli långsamma och dyra att bearbeta.
- Databasen kan bli stor snabbt om många dokument laddas upp.
- Om dokumenten delas av flera användare kan organisation och säkerhet bli problem.

8. Fokus framåt

Om du vill bygga vidare på detta projekt är de bästa nästa stegen:

1. Stabilisera kärnflödet
   - testa upload, indexering och frågor i verkliga scenarier,
   - se till att appen fungerar på flera olika PDF:er.

2. Förbättra dokumentindexering
   - bättre chunkning,
   - bättre struktur,
   - möjligheter att uppdatera och radera dokument.

3. Bättre användarkontroll
   - separera användare,
   - lagra dokument per användare,
   - kontrollera åtkomst.

4. Mät svarens kvalitet
   - vad är “bra svar”?,
   - hur vet vi att AI:n använder rätt kontext?

5. Gör det mer robust för verklig användning
   - felhantering,
   - observability,
   - säkerhet,
   - testning,
   - optimering.

9. Kort sammanfattning

Detta projekt är redan en fungerande prototyp för ett dokumentbaserat AI-assistent-system.

Det har en tydlig grund:
- upload av PDF,
- extraktion av text,
- chunking,
- embeddings,
- vektorsökning,
- AI-svar med dokumentkontext.

Det är ett bra startläge. Nu är nästa steg inte att bygga allt från början igen, utan att göra systemet mer stabilt, säkert och användbart i verkligheten.

Det viktigaste framöver är att fokusera på kvalitet, struktur och ansvarstagande för hur AI:n faktiskt svarar.

10. Tips för nästa steg

Använd detta projekt som ett fungerande proof of concept och bygg vidare med fokus på:
- bättre dokumentflöde,
- säkrare arkitektur,
- tydliga användarföljder,
- bättre kvalitetssäkring,
- validering av svar från AI:n.

Om du vill, kan du nu lägga in en kompetensmatris för att beskriva:
- vad som redan finns,
- vad som är bra,
- vad som saknas,
- vad du vill utveckla framåt.

Det blir ett bra underlag för planering av nästa utvecklingsfas.
