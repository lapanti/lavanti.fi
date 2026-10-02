import type { LocalTag } from './types'

export const digitalisationTag: LocalTag = {
    descriptions: {
        en: [
            'Digitalisation is both an opportunity and a risk. Finland must lead with quality, not just speed — getting it wrong at scale is expensive and hard to reverse.',
            'Public sector digitalisation specifically requires interoperability, open standards, and accessibility for everyone — not just those comfortable with digital interfaces. Vendor lock-in is the largest long-term risk: when public services are built on proprietary platforms, the public sector loses negotiating power and flexibility. As a software professional I have seen many times how procurement decisions made without technical consideration create dependencies that cost more to exit than anyone is prepared to pay.',
            'The human dimension matters too. Digitalisation must not exclude people who struggle with online interfaces — GP appointments, benefit claims, and permit applications must remain accessible through non-digital channels. Efficiency gains should not be achieved by forcing the most vulnerable to adapt to the most convenient channel for the provider.',
        ],
        fi: [
            'Digitalisaatio on sekä mahdollisuus että riski. Suomen on johdettava laadulla, ei pelkästään nopeudella — laajamittainen epäonnistuminen on kallista ja vaikea peruuttaa.',
            'Julkisen sektorin digitalisaatiossa tarvitaan erityisesti yhteentoimivuutta, avoimia standardeja ja saavutettavuutta kaikille — ei vain niille, joille digitaaliset käyttöliittymät ovat luontevia. Toimittajariippuvuus on suurin pitkän aikavälin riski: kun julkiset palvelut rakennetaan suljetuille alustoille, julkinen sektori menettää neuvotteluvoimaa ja joustavuutta. Ohjelmistoalan asiantuntijana olen nähnyt monta kertaa, miten hankintapäätökset ilman teknistä harkintaa luovat riippuvuuksia, joista irtautuminen maksaa enemmän kuin ollaan valmiita maksamaan.',
            'Inhimillinen ulottuvuus on myös tärkeää. Digitalisaatio ei saa syrjäyttää ihmisiä, joille verkkokäyttöliittymät tuottavat vaikeuksia — lääkäriajat, etuushakemukset ja lupahakemukset on pidettävä saavutettavina myös ei-digitaalisilla kanavilla. Tehokkuushyötyjä ei tule saavuttaa pakottamalla kaikkein haavoittuvimmat sopeutumaan palveluntarjoajalle käteisimpään kanavaan.',
        ],
        sv: [
            'Digitalisering är både en möjlighet och en risk. Finland måste leda med kvalitet, inte bara hastighet — att misslyckas i stor skala är dyrt och svårt att reversera.',
            'Offentlig sektors digitalisering kräver specifikt interoperabilitet, öppna standarder och tillgänglighet för alla — inte bara de som är bekväma med digitala gränssnitt. Leverantörsinlåsning är den största långsiktiga risken: när offentliga tjänster byggs på proprietära plattformar förlorar den offentliga sektorn förhandlingsstyrka och flexibilitet. Som programvaruexpert har jag många gånger sett hur upphandlingsbeslut utan teknisk eftertanke skapar beroenden som kostar mer att lämna än man är beredd att betala.',
            'Den mänskliga dimensionen spelar också roll. Digitalisering får inte utesluta människor som har svårt med onlinegränssnitt — läkarbesök, förmånsansökningar och tillståndsansökningar måste förbli tillgängliga via icke-digitala kanaler. Effektivitetsvinster bör inte uppnås genom att tvinga de mest utsatta att anpassa sig till den kanal som är mest bekväm för leverantören.',
        ],
    },
    faq: {
        en: [
            {
                a: "When the supplier cannot be replaced, the price stops being set by the market. The supplier knows the customer cannot leave, and the negotiating power shifts to the supplier for good. When public administration builds its systems on one supplier's closed platform, switching becomes more expensive and difficult over the years. The data is then locked in, and control over it has in effect been handed away.",
                q: 'Why does vendor lock-in cost taxpayers so much?',
            },
            {
                a: "Portability is a property of the procurement that guarantees the system's data, processes and integrations can be moved to another supplier at reasonable cost. It only exists if it is written into the contract and the technical specification before the procurement decision. In practice it needs publicly documented data formats, integrations built on well-known interface standards and an exit clause in every contract. Without these, switching supplier is possible in theory but often too expensive in practice.",
                q: 'What does portability in public procurement mean?',
            },
            {
                a: 'Because digitalisation and AI do not replace a clear plan. Poorly defined processes or objectives only lead to bad outcomes faster with AI. Municipalities first need to identify which services they want to develop and design them for automation, and only then bring in the machine. There are no quick wins; it is a long-term investment that requires money. A small municipality cannot do it alone, but Konnevesi succeeded in collaboration with seven other municipalities.',
                q: 'Why does digitalising public services require long-term planning?',
            },
        ],
        fi: [
            {
                a: 'Kun toimittajaa ei voi vaihtaa, hinta lakkaa ohjautumasta markkinaehtoisesti. Toimittaja tietää, ettei asiakas voi lähteä, ja neuvotteluasema siirtyy pysyvästi sille. Kun julkishallinto rakentaa järjestelmänsä yhden toimittajan suljetun alustan varaan, vaihtaminen muuttuu vuosien kuluessa yhä kalliimmaksi ja vaikeammaksi. Data on silloin lukittu, ja sen hallinta on tosiasiassa luovutettu pois.',
                q: 'Miksi toimittajalukkiutuminen tulee veronmaksajalle kalliiksi?',
            },
            {
                a: 'Siirrettävyys on hankinnan ominaisuus, joka takaa, että järjestelmän data, prosessit ja integraatiot voidaan siirtää toiselle toimittajalle ilman kohtuutonta kustannusta. Se syntyy vain, jos se kirjataan sopimukseen ja tekniseen määrittelyyn ennen hankintapäätöstä. Käytännössä dataformaattien on oltava julkisesti dokumentoituja, integraatioiden nojattava tunnettuihin rajapintastandardeihin ja sopimukseen kirjattava irtautumislauseke. Ilman näitä toimittajan vaihtaminen on teoriassa mahdollista, mutta käytännössä usein liian kallista.',
                q: 'Mitä julkishankintojen siirrettävyys tarkoittaa?',
            },
            {
                a: 'Koska digitalisaatio ja tekoäly eivät korvaa selkeää suunnitelmaa. Huonosti määritellyt prosessit tai tavoitteet johtavat tekoälyllä vain nopeammin huonoihin tuloksiin. Ensin pitää tunnistaa, mitä palveluja halutaan kehittää, ja suunnitella ne automatisoitaviksi. Vasta sitten voidaan ottaa kone mukaan. Pikavoittoja ei ole tarjolla, vaan kyse on pitkäjänteisestä investoinnista, joka vaatii rahaa. Pieni kunta ei pysty siihen yksin, mutta Konnevesi onnistui yhteistyössä seitsemän muun kunnan kanssa.',
                q: 'Miksi julkisten palveluiden digitalisointi vaatii pitkäjänteistä suunnittelua?',
            },
        ],
        sv: [
            {
                a: 'När leverantören inte går att byta slutar priset styras av marknaden. Leverantören vet att kunden inte kan lämna, och förhandlingsläget flyttas permanent över till leverantören. När den offentliga förvaltningen bygger sina system på en enda leverantörs slutna plattform blir ett byte dyrare och svårare för varje år. Datan är då inlåst, och kontrollen över den har i praktiken lämnats bort.',
                q: 'Varför blir leverantörsinlåsning dyrt för skattebetalarna?',
            },
            {
                a: 'Portabilitet är en egenskap hos upphandlingen som garanterar att systemets data, processer och integrationer kan flyttas till en annan leverantör utan orimliga kostnader. Den uppstår bara om den skrivs in i avtalet och i den tekniska specifikationen före upphandlingsbeslutet. I praktiken krävs offentligt dokumenterade dataformat, integrationer som bygger på kända gränssnittsstandarder och en exitklausul i avtalet. Saknas de är ett leverantörsbyte möjligt i teorin, men i praktiken ofta för dyrt.',
                q: 'Vad betyder portabilitet i offentliga upphandlingar?',
            },
            {
                a: 'För att digitalisering och AI inte ersätter en tydlig plan. Dåligt definierade processer eller mål leder bara snabbare till dåliga resultat med AI. Först måste man identifiera vilka tjänster som ska utvecklas och utforma dem för automatisering, och först därefter kan maskinen tas i bruk. Det finns inga snabba vinster, utan det krävs långsiktiga investeringar och pengar. En mindre kommun klarar det inte ensam, men i Konnevesi lyckades projektet i samarbete med sju andra kommuner.',
                q: 'Varför kräver digitaliseringen av offentliga tjänster långsiktig planering?',
            },
        ],
    },
    featured: [80, 53, 44],
    id: 'digitalisation',
    metaDescription: {
        en: 'Digitalisation is both an opportunity and a risk. Finland must lead with quality, not just speed — getting it wrong at scale is expensive and hard to reverse.',
        fi: 'Digitalisaatio on sekä mahdollisuus että riski. Suomen on johdettava laadulla, ei pelkästään nopeudella — epäonnistuminen mittakaavassa on kallista.',
        sv: 'Digitalisering är både en möjlighet och en risk. Finland måste leda med kvalitet, inte bara hastighet — att misslyckas i stor skala är dyrt.',
    },
    names: { en: 'Digitalisation', fi: 'Digitalisaatio', sv: 'Digitalisering' },
    pageTitle: {
        en: 'Digitalisation – IT and information policy',
        fi: 'Digitalisaatio – IT ja tietopolitiikka',
        sv: 'Digitalisering – IT och in\u00ADformations\u00ADpolitik',
    },
    slugs: { en: 'digitalisation', fi: 'digitalisaatio', sv: 'digitalisering' },
    updatedDate: '2026-10-02',
}
