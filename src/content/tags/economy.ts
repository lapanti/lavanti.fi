import type { LocalTag } from './types'

export const economyTag: LocalTag = {
    descriptions: {
        en: [
            'Finland’s economy needs to keep working through the AI transition. That means new companies, new jobs, and public services that actually use the technology rather than just buy it in from outside. Without serious technology competence in parliament, decisions about AI procurement, data infrastructure, and labour policy are made by people who don’t know what they are buying.',
            'I write about the economy through the lens of what I have done for over a decade: built software and software teams across different industries. AI changes the basis of work, competitiveness and public services. Finland can lead this shift, but only if public investment is targeted at domestic capability in a way that actually understands what is being done.',
            'A working economy in the AI era is not just a slogan. It is substance: skills that survive the transition, businesses that can build on Finnish and European infrastructure, and a state that procures technology on its own terms.',
        ],
        fi: [
            'Suomen talouden on toimittava tekoälyn aikakaudella. Se tarkoittaa uusia yrityksiä, uusia työpaikkoja ja julkisia palveluita, jotka oikeasti käyttävät teknologiaa eivätkä vain osta sitä ulkopuolelta. Ilman teknologiaosaamista eduskunnassa päätökset tekoälyhankinnoista, datainfrastruktuurista ja työelämästä tekevät ihmiset, jotka eivät tiedä mitä ovat ostamassa.',
            'Kirjoitan taloudesta sen kautta, mitä olen tehnyt yli vuosikymmenen ajan: rakentanut ohjelmistoja ja ohjelmistotiimejä eri teollisuudenaloilla. Tekoäly muuttaa työn, kilpailukyvyn ja julkisten palveluiden perustan. Suomi voi olla tässä edelläkävijä, mutta vain jos julkinen panostus suunnataan kotimaiseen osaamiseen siten, että ymmärretään mitä ollaan tekemässä.',
            'Toimiva talous tekoälyn aikana ei ole pelkkä slogan. Se on konkretiaa: osaamista, joka kestää murroksen yli, yrityksiä, jotka voivat rakentaa suomalaisen ja eurooppalaisen infrastruktuurin päälle, ja valtio, joka hankkii teknologiaa omilla ehdoillaan.',
        ],
        sv: [
            'Finlands ekonomi måste fungera under AI-omställningen. Det betyder nya företag, nya jobb och offentliga tjänster som faktiskt använder tekniken — inte bara köper in den utifrån. Utan teknisk kompetens i riksdagen fattas beslut om AI-upphandling, datainfrastruktur och arbetslivet av människor som inte vet vad de köper.',
            'Jag skriver om ekonomin utifrån vad jag gjort i över ett årtionde: byggt programvara och programvaruteam inom olika branscher. AI förändrar grunden för arbete, konkurrenskraft och offentliga tjänster. Finland kan leda omställningen, men bara om offentliga satsningar riktas mot inhemsk kompetens på ett sätt som faktiskt förstår vad som görs.',
            'En fungerande ekonomi i AI-eran är inte bara en slogan. Det är substans: kompetens som överlever omställningen, företag som kan bygga på finsk och europeisk infrastruktur, och en stat som upphandlar teknik på sina egna villkor.',
        ],
    },
    faq: {
        en: [
            {
                a: 'AI does not replace experts, but it changes what they get paid for. Software is the first industry where this shows: according to Professor Pekka Abrahamsson of Tampere University, AI does in two minutes what used to take a developer two weeks. Routine production is automated, while decision-making, recognising context and bearing responsibility grow in value. Every field with repetitive knowledge work faces the same structural change, and Finland still has no coordinated answer on reskilling or safety nets.',
                q: 'How does AI change work?',
            },
            {
                a: 'When a public system is locked inside one supplier’s closed solution, the price stops being set by the market. The supplier knows the customer cannot leave, and the negotiating power shifts to the supplier for good. The fix is portability: publicly documented data formats, well-known interface standards and an exit clause written into the contract. The Procurement Act should require portability for critical systems from the call for tenders onwards, with open source as their default.',
                q: 'Why does vendor lock-in cost taxpayers so much?',
            },
            {
                a: 'An ecosystem can be built around data centres, as once around Nokia: network infrastructure, industrial premises, cooling and power distribution solutions, and on top of them software and research work. Then a significant share of the value stays in Finland as wages, tax revenue, jobs and expertise. Data centres are also foreign policy, because physical location determines whose rules a service operates under. That is why they should be built on Finland’s terms, without any new subsidy scheme.',
                q: 'What does Finland gain from data centres?',
            },
        ],
        fi: [
            {
                a: 'Tekoäly ei korvaa osaajia, mutta muuttaa sen, mistä heille maksetaan. Ohjelmistoala näkee muutoksen ensimmäisenä: Tampereen yliopiston professori Pekka Abrahamssonin mukaan tekoäly tekee kahdessa minuutissa sen, mihin kehittäjältä meni kaksi viikkoa. Rutiinituotanto automatisoituu, ja päätöksenteon, kontekstin tunnistamisen ja vastuun kantamisen arvo kasvaa. Sama rakenteellinen muutos koskee jokaista alaa, jossa on toistuvaa tietotyötä, eikä Suomessa ole vielä koordinoitua vastausta osaamisen uudistamiseen tai turvaverkkoihin.',
                q: 'Miten tekoäly muuttaa työtä?',
            },
            {
                a: 'Kun julkinen järjestelmä on lukittu yhden toimittajan suljettuun ratkaisuun, hinta lakkaa ohjautumasta markkinaehtoisesti. Toimittaja tietää, ettei asiakas voi lähteä, ja neuvotteluasema siirtyy pysyvästi sille. Ratkaisu on siirrettävyys: julkisesti dokumentoidut dataformaatit, tunnetut rajapintastandardit ja sopimukseen kirjattu irtautumislauseke. Hankintalain pitäisi vaatia siirrettävyyttä kriittisiltä järjestelmiltä jo tarjouspyynnöstä alkaen, ja avoin lähdekoodi pitäisi asettaa niissä oletukseksi.',
                q: 'Miksi toimittajariippuvuus tulee veronmaksajalle kalliiksi?',
            },
            {
                a: 'Datakeskusten ympärille voi rakentaa ekosysteemin, kuten aikanaan Nokian ympärille: verkkoinfrastruktuuria, teollisia toimitiloja, jäähdytys- ja sähkönjakeluratkaisuja sekä niiden päälle ohjelmisto- ja tutkimustyötä. Silloin merkittävä osa arvosta jää Suomeen palkkoina, verotuloina, työpaikkoina ja osaamisena. Datakeskukset ovat myös ulkopolitiikkaa, koska fyysinen sijainti ratkaisee, kenen säännöillä palvelu toimii. Siksi ne kannattaa rakentaa Suomen ehdoilla, ilman uutta tukijärjestelmää.',
                q: 'Mitä hyötyä datakeskuksista on Suomelle?',
            },
        ],
        sv: [
            {
                a: 'AI ersätter inte kunnigt folk, men förändrar vad de får betalt för. Mjukvarubranschen ser förändringen först: enligt professor Pekka Abrahamsson vid Tammerfors universitet gör AI på två minuter det som en programutvecklare tidigare behövde två veckor för. Rutinproduktionen automatiseras, medan beslutsfattande, att känna igen kontexten och att bära ansvar ökar i värde. Varje bransch med återkommande kunskapsarbete möter samma strukturella förändring, och Finland saknar ännu samordnade svar om kompetensförnyelse och skyddsnät.',
                q: 'Hur förändrar AI arbetet?',
            },
            {
                a: 'När ett offentligt system är inlåst i en enda leverantörs slutna lösning slutar priset styras av marknaden. Leverantören vet att kunden inte kan lämna, och förhandlingsläget flyttas permanent över till leverantören. Lösningen är portabilitet: offentligt dokumenterade dataformat, kända gränssnittsstandarder och en exitklausul i avtalet. Upphandlingslagen borde kräva portabilitet för kritiska system redan från anbudsförfrågan, och öppen källkod borde vara standard i dem.',
                q: 'Varför blir leverantörsberoende dyrt för skattebetalarna?',
            },
            {
                a: 'Runt datacenter kan man bygga ett ekosystem som en gång runt Nokia: nätinfrastruktur, industrilokaler, kyl- och eldistributionslösningar och ovanpå dem programvaru- och forskningsarbete. Då stannar en betydande del av värdet i Finland som löner, skatteintäkter, arbetsplatser och kunnande. Datacenter är också utrikespolitik, eftersom den fysiska platsen avgör vems regler en tjänst följer. Därför lönar det sig att bygga dem på Finlands villkor, utan något nytt stödsystem.',
                q: 'Vilken nytta har Finland av datacenter?',
            },
        ],
    },
    featured: [80, 57, 71],
    id: 'economy',
    metaDescription: {
        en: 'Finland’s economy needs to work through the AI era — new companies, new jobs, and world-class public services.',
        fi: 'Suomen talous tulee saada toimivaksi tekoälyn aikakaudella — uusia yrityksiä, työpaikkoja ja maailmanluokan julkisia palveluita.',
        sv: 'Finlands ekonomi måste fungera i AI-eran — nya företag, nya jobb och offentliga tjänster i världsklass.',
    },
    names: { en: 'Economy', fi: 'Talous', sv: 'Ekonomi' },
    pageTitle: {
        en: 'Keeping the economy working with AI',
        fi: 'Talous toimivaksi tekoälyn aikakaudella',
        sv: 'Ekonomi som fungerar i AI-erans Finland',
    },
    slugs: { en: 'economy', fi: 'talous', sv: 'ekonomi' },
    updatedDate: '2026-10-02',
}
