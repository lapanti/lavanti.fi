import type { LocalTag } from './types'

export const artificialIntelligenceTag: LocalTag = {
    descriptions: {
        en: [
            'I use and build AI tools in my work every day. AI is the most significant technological shift of our time, and Finland must engage with it actively — so we get the benefits, not just the harms.',
            'AI amplifies both capability and harm. In public-sector applications — benefits decisions, permit processing, predictive policing — the stakes are too high to deploy systems without transparency and oversight. I advocate for auditable algorithms in consequential decisions, open AI models where feasible, and mandatory human review for decisions that affect individual rights.',
            'The more powerful AI becomes, the more important privacy protections are. AI systems are data-hungry; without strong data protection rules, they become surveillance infrastructure. The EU AI Act is a step in the right direction, but implementation must be genuine — not just a formality.',
        ],
        fi: [
            'Käytän ja kehitän tekoälytyökaluja työssäni päivittäin. Tekoäly on aikamme merkittävin teknologinen murros, ja Suomen on tartuttava siihen aktiivisesti, jotta saamme siitä hyötyjä emmekä pelkkiä haittoja.',
            'Tekoäly vahvistaa sekä kykyjä että vahinkoja. Julkisen sektorin sovelluksissa — etuuspäätöksissä, lupien käsittelyssä, ennakoivassa poliisitoiminnassa — panokset ovat liian suuria, jotta järjestelmiä voitaisiin ottaa käyttöön ilman läpinäkyvyyttä ja valvontaa. Haluan tarkistettavissa olevia algoritmeja merkityksellisiin päätöksiin, avoimia tekoälymalleja silloin kun mahdollista, ja pakollista ihmisvalvontaa yksilöiden oikeuksiin vaikuttavissa päätöksissä.',
            'Mitä voimakkaammaksi tekoäly kehittyy, sitä tärkeämmäksi yksityisyyden suoja tulee. Tekoälyjärjestelmät ovat tiedonnälkäisiä; ilman vahvoja tietosuojasääntöjä niistä tulee valvontainfrastruktuuria. EU:n tekoälysäädös on askel oikeaan suuntaan, mutta toimeenpanon on oltava tosiasiallista — ei pelkkä muodollisuus.',
        ],
        sv: [
            'Jag använder och bygger AI-verktyg i mitt arbete varje dag. AI är vår tids mest betydande teknologiska förändring, och Finland måste engagera sig med det aktivt — så att vi får nyttorna, inte bara nackdelarna.',
            'AI förstärker både förmåga och skada. I offentliga tillämpningar — förmånsbeslut, tillståndshantering, prediktiv polisverksamhet — är insatserna för höga för att driftsätta system utan transparens och tillsyn. Jag förespråkar revisionsbara algoritmer vid konsekventa beslut, öppna AI-modeller där det är möjligt, och obligatorisk mänsklig granskning av beslut som påverkar individers rättigheter.',
            'Ju kraftfullare AI blir, desto viktigare blir integritetsskyddet. AI-system är datahungriga; utan starka dataskyddsregler blir de övervakningsinfrastruktur. EU:s AI-förordning är ett steg i rätt riktning, men genomförandet måste vara genuint — inte bara en formalitet.',
        ],
    },
    faq: {
        en: [
            {
                a: "As a tool for well-understood problems, such as the slow recording of a doctor's observations, and always under human oversight. In Konnevesi, AI prepares a draft decision, which an official then reviews and approves. A good rule of thumb is that a machine should never make a negative decision, and unclear cases always go to a human. AI cannot be held officially accountable or replace human interaction, so expert assessment is still needed.",
                q: 'How should AI be used in public services?',
            },
            {
                a: 'AI does not replace coders. It changes what they get paid for. Software is the first industry where this shows: according to Professor Pekka Abrahamsson of Tampere University, AI does in two minutes what used to take a developer two weeks. Routine production is automated, while decision-making, recognising context and bearing responsibility grow in value. Every industry with repetitive knowledge work faces the same change, and Finland still lacks coordinated initiatives on reskilling and safety nets.',
                q: 'How does AI change work?',
            },
            {
                a: 'AI makes mass surveillance technically easier, which is exactly why legislation has to hold the line on fundamental rights. The same principle that made the European Parliament right to reject the chat control proposal applies to any automatic scanning of private messages. Without strong privacy protection, democracy cannot function, and AI must never be used to weaken it. Fundamental rights have to be the starting point for all legislation.',
                q: 'How does AI threaten fundamental rights?',
            },
        ],
        fi: [
            {
                a: 'Työkaluna hyvin ymmärrettyihin ongelmiin, kuten lääkärin havaintojen hitaaseen kirjaamiseen, ja aina ihmisen valvonnassa. Konnevedellä tekoäly valmistelee päätösehdotuksen, jonka viranhaltija tarkistaa ennen kuin tekee päätöksen. Hyvä nyrkkisääntö on, että kone ei saa koskaan tehdä kielteistä päätöstä, ja epäselvät tapaukset menevät aina ihmiselle. Tekoäly ei voi olla virkavastuussa eikä korvata inhimillistä kohtaamista, joten asiantuntijan arvio tarvitaan edelleen.',
                q: 'Miten tekoälyä pitäisi käyttää julkisissa palveluissa?',
            },
            {
                a: 'Tekoäly ei korvaa koodareita. Se muuttaa sen, mistä heille maksetaan. Ohjelmistoala on ensimmäinen ala, jossa muutos näkyy. Tampereen yliopiston professori Pekka Abrahamssonin mukaan tekoäly tekee kahdessa minuutissa sen, mihin kehittäjältä meni ennen kaksi viikkoa. Rutiinituotanto automatisoituu, ja arvoaan kasvattavat päätöksenteko, kontekstin tunnistaminen ja vastuun kantaminen. Sama muutos koskee jokaista alaa, jossa on toistuvaa tietotyötä, eikä Suomessa ole vielä koordinoituja aloitteita osaamisen uudistamiseen tai turvaverkkojen soveltamiseen.',
                q: 'Miten tekoäly muuttaa työtä?',
            },
            {
                a: 'Tekoäly helpottaa massavalvontaa teknisesti, ja siksi lainsäädännön on pidettävä kiinni perusoikeuksista. Sama periaate, jonka vuoksi EU:n chat control -esityksen hylkääminen oli oikea päätös, koskee kaikkea yksityisviestien automaattista skannausta. Ilman vahvaa yksityisyydensuojaa demokratia ei voi toimia, eikä tekoälyä saa missään tapauksessa käyttää sen heikentämiseen. Perusoikeuksien tulee olla kaiken lainsäädännön lähtökohta.',
                q: 'Miten tekoäly uhkaa perusoikeuksia?',
            },
        ],
        sv: [
            {
                a: 'Som ett verktyg för väl förstådda problem, som den långsamma dokumentationen av en läkares observationer, och alltid under mänsklig tillsyn. I Konnevesi förbereder AI ett beslutsförslag, som sedan granskas och beslutas av en tjänsteman. En bra tumregel är att en maskin aldrig ska fatta negativa beslut, och alla tveksamma fall granskas av en människa. AI kan inte hållas tjänstemannarättsligt ansvarigt eller ersätta det mänskliga mötet, så experters bedömning behövs fortfarande.',
                q: 'Hur bör AI användas i offentliga tjänster?',
            },
            {
                a: 'AI ersätter inte kodare. Det förändrar vad de får betalt för. Mjukvarubranschen är först: enligt professor Pekka Abrahamsson vid Tammerfors universitet gör AI på två minuter det som en utvecklare tidigare behövde två veckor för. Rutinproduktionen automatiseras, medan beslutsfattande, att känna igen sammanhang och att bära ansvar ökar i värde. Varje bransch med repetitivt kunskapsarbete möter samma förändring, och i Finland saknas samordnade initiativ om hur kompetensen ska förnyas och skyddsnäten tillämpas.',
                q: 'Hur förändrar AI arbetet?',
            },
            {
                a: 'AI gör massövervakning tekniskt enklare, och just därför måste lagstiftningen hålla fast vid de grundläggande rättigheterna. Samma princip som gjorde det rätt av Europaparlamentet att förkasta chat control-förslaget gäller all automatisk skanning av privata meddelanden. Utan ett starkt integritetsskydd kan demokratin inte fungera, och AI får aldrig användas för att försvaga det. Grundläggande rättigheter ska vara utgångspunkten för all lagstiftning.',
                q: 'Hur hotar AI de grundläggande rättigheterna?',
            },
        ],
    },
    featured: [44, 57, 60],
    id: 'artificial-intelligence',
    metaDescription: {
        en: 'I use and build AI tools for a living. It is critical that Finland seizes the opportunities AI brings, while managing the risks that come with it.',
        fi: 'Käytän ja rakennan tekoälytyökaluja työkseni. On kriittistä, että Suomi tarttuu tekoälyn tuomiin mahdollisuuksiin, halliten samalla siihen liittyviä riskejä.',
        sv: 'Jag använder och bygger AI-verktyg för mitt uppehälle. Det är avgörande att Finland tar vara på möjligheterna AI ger, samtidigt som vi hanterar riskerna.',
    },
    names: { en: 'AI', fi: 'Tekoäly', sv: 'AI' },
    pageTitle: {
        en: 'Artificial intelligence – benefits and harms',
        fi: 'Tekoäly – hyödyistä, haitoista, politiikasta',
        sv: 'Artificiell intelligens – nyttor och skador',
    },
    slugs: { en: 'artificial-intelligence', fi: 'tekoaly', sv: 'artificiell-intelligens' },
    updatedDate: '2026-10-02',
}
