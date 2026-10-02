import type { LocalTag } from './types'

export const freedomTag: LocalTag = {
    descriptions: {
        en: [
            'Freedom is one of the most important questions of the AI era. It is whether your data, your communications and your ordinary life remain yours when most of the infrastructure around them is owned by someone else. Privacy is the basic case — but the broader question is whether civil liberties survive technology that makes mass surveillance almost free.',
            "I have spent my career building software in environments where the rules around data were taken seriously — regulated fields like finance — as well as environments where data is the business itself. That experience makes one thing obvious: privacy and civil liberties don't protect themselves. They are protected by laws, by regulations, and by individuals who care about it passionately.",
            'Securing freedom in the AI era requires carefully weighed trade-offs and strict limits. Mass surveillance, expanding the use of biometric identifiers, or automatic scanning of messages are not tools to be adopted lightly, if at all. Every step that erodes privacy needs airtight justification and clear evidence of benefit — without that, it has no case.',
        ],
        fi: [
            'Vapaus on yksi tekoälyn aikakauden tärkeimmistä kysymyksistä. Se on kysymys siitä pysyykö datasi, viestintäsi ja arkesi sinun ominasi, kun suurin osa infrastruktuurista, jossa ne ovat, on jonkun toisen omistuksessa. Yksityisyydensuoja on perusoikeus — mutta laajempi kysymys on, säilyvätkö perusoikeudet teknologiassa, joka tekee massojen valvomisen lähes ilmaiseksi.',
            'Olen rakentanut urallani ohjelmistoja ympäristöissä, joissa datan säännöt otetaan vakavasti — säännellyillä aloilla kuten finanssialalla — sekä ympäristöissä, joissa data on liiketoimintaa. Se kokemus on tehnyt yhden asian selväksi: yksityisyys ja perusoikeudet eivät suojaa itse itseään. Niitä suojaavat lait, asetukset ja yksilöt, jotka suhtautuvat asiaan intohimoisesti.',
            'Vapauden varmaksi tekeminen tekoälyn aikana edellyttää punnittuja myönnytyksiä sekä tiukkoja rajoja. Massavalvonta, biometristen tunnisteiden käytön laajentaminen tai viestien automaattinen seulonta eivät ole työkaluja, joita tulee ottaa käyttöön kevyesti, jos laisinkaan. Jokaiselle yksityisyyttä murentavalle askeleella pitää olla aukottomat perustelut ja selkeää näyttöä hyödyistä, muuten punnintaa sen järkevyydestä ei voi, eikä kannata, tehdä.',
        ],
        sv: [
            'Frihet är en av de viktigaste frågorna under AI-eran. Det är frågan om dina data, din kommunikation och din vardag förblir dina när merparten av infrastrukturen runt dem ägs av någon annan. Integritetsskyddet är grundfallet — men den bredare frågan är om medborgerliga rättigheter överlever en teknik som gör massövervakning nästan gratis.',
            'Jag har under min karriär byggt programvara i miljöer där reglerna kring data tas på allvar — reglerade branscher som finanssektorn — samt miljöer där data är själva affärsverksamheten. Den erfarenheten gör en sak uppenbar: integritet och medborgerliga rättigheter skyddar sig inte själva. De skyddas av lagar, av förordningar och av individer som brinner för frågan.',
            'Att trygga friheten i AI-eran kräver noga avvägda eftergifter samt strikta gränser. Massövervakning, utvidgad användning av biometriska identifierare eller automatisk granskning av meddelanden är inte verktyg som bör tas i bruk lättvindigt, om alls. Varje steg som urholkar integriteten kräver vattentäta motiveringar och tydliga bevis för sin nytta — utan det finns ingen sak att försvara.',
        ],
    },
    faq: {
        en: [
            {
                a: 'AI makes mass surveillance technically easier, so legislation has to hold the line on fundamental rights. The same principle that made rejecting the EU’s chat control proposal the right call applies to any automatic scanning of private messages. Without strong privacy protection, democracy cannot function, and AI must never be used to weaken it. Fundamental rights have to be the starting point for all legislation, not a variable.',
                q: 'How does AI threaten fundamental rights?',
            },
            {
                a: 'Because a concrete suspicion before surveillance is the rule-of-law minimum, not special treatment for privacy. Police cannot obtain a search warrant without reasonable grounds, and wiretapping requires a court order. The same principles belong in the digital environment. Untargeted surveillance is also ineffective: organised crime has already moved to the dark web and encrypted apps that scanning does not reach, so the surveillance would fall on ordinary users.',
                q: 'Why should surveillance not be extended without individual suspicion?',
            },
            {
                a: 'A fingerprint or a face now works like a password, but it cannot be changed. Finland is one of the few EU countries that stores biometric passport data in a permanent national register, and citizens were in practice forced to hand it over. Opening it to the police erodes trust, and once a use is opened, it is likely to be widened year after year. The better model is Germany’s, where fingerprint data is destroyed once the passport has been created.',
                q: 'Why should the use of biometric data not be expanded?',
            },
        ],
        fi: [
            {
                a: 'Tekoäly helpottaa massavalvontaa teknisesti, ja siksi lainsäädännön on pidettävä kiinni perusoikeuksista. Sama periaate, jonka vuoksi EU:n chat control -esityksen hylkääminen oli oikea päätös, koskee kaikkea yksityisviestien automaattista skannausta. Ilman vahvaa yksityisyydensuojaa demokratia ei voi toimia, eikä tekoälyä saa missään tapauksessa käyttää sen heikentämiseen. Perusoikeuksien tulee olla kaiken lainsäädännön lähtökohta.',
                q: 'Miten tekoäly uhkaa perusoikeuksia?',
            },
            {
                a: 'Koska konkreettinen epäily ennen valvontaa on oikeusvaltion minimi, ei yksityisyyden suojan erikoiskohtelua. Poliisi ei saa kotietsintälupaa ilman perusteltua syytä, ja puhelinkuunteluun tarvitaan tuomioistuimen päätös. Samat periaatteet kuuluvat digitaaliseen ympäristöön. Kohdentamaton valvonta on myös tehotonta: järjestäytynyt rikollisuus on jo siirtynyt pimeään verkkoon ja salattuihin sovelluksiin, joita skannaus ei tavoita, joten valvonnan kohteeksi jäisivät tavalliset käyttäjät.',
                q: 'Miksi valvontaa ei pidä laajentaa ilman yksilöityä epäilyä?',
            },
            {
                a: 'Sormenjälki ja kasvot ovat nykyään kuin salasana, mutta niitä ei voi vaihtaa. Suomi on harvoja EU-maita, jotka tallentavat passien biometriset tiedot pysyvään kansalliseen rekisteriin, ja kansalaiset on käytännössä pakotettu luovuttamaan ne. Rekisterin avaaminen poliisille murentaa luottamusta, ja kerran avattua käyttöä halutaan todennäköisesti laajentaa vuosi vuodelta. Parempi malli on Saksan, jossa sormenjälkitieto tuhotaan kaikista järjestelmistä passin luomisen jälkeen.',
                q: 'Miksi biometristen tietojen käyttöä ei pidä laajentaa?',
            },
        ],
        sv: [
            {
                a: 'AI gör massövervakning tekniskt enklare, så lagstiftningen måste hålla fast vid de grundläggande rättigheterna. Samma princip som gjorde det rätt att förkasta EU:s chat control-förslag gäller all automatisk skanning av privata meddelanden. Utan ett starkt integritetsskydd kan demokratin inte fungera, och AI får aldrig användas för att försvaga det. Grundläggande rättigheter ska vara utgångspunkten för all lagstiftning, inte en variabel.',
                q: 'Hur hotar AI de grundläggande rättigheterna?',
            },
            {
                a: 'Därför att en konkret misstanke före övervakning är rättsstatens minimum, inte en särbehandling av integriteten. Polisen kan inte få husrannsakningstillstånd utan grundad anledning, och telefonavlyssning kräver domstolsbeslut. Samma principer hör hemma i den digitala miljön. Oriktad övervakning är dessutom ineffektiv: den organiserade brottsligheten har redan flyttat till darknet och krypterade appar som skanningen inte når, så övervakningen skulle träffa vanliga användare.',
                q: 'Varför ska övervakningen inte utvidgas utan individuell misstanke?',
            },
            {
                a: 'Fingeravtryck och ansikte fungerar i dag som ett lösenord, men de kan inte bytas ut. Finland är ett av få EU-länder som lagrar biometriska passuppgifter i ett permanent nationellt register, och medborgarna har i praktiken tvingats lämna ifrån sig uppgifterna. Att öppna registret för polisen urholkar förtroendet, och en användning som en gång öppnats vill man sannolikt utvidga år för år. Den bättre modellen är den tyska, där fingeravtrycksuppgifterna förstörs efter att passet skapats.',
                q: 'Varför ska användningen av biometriska uppgifter inte utvidgas?',
            },
        ],
    },
    featured: [54, 48, 45],
    id: 'freedom',
    metaDescription: {
        en: 'Freedom matters more than ever in the AI era. When linking data and surveillance is a button press away, fundamental rights need strengthening.',
        fi: 'Vapaus on tekoälyn aikakaudella tärkeämpää kuin koskaan. Kun datojen yhdistely ja valvonta onnistuu nappia painamalla, pitää perusoikeuksia vahvistaa.',
        sv: 'Frihet är viktigare än någonsin under AI-eran. När det går att koppla ihop data och övervaka med ett knapptryck, måste de grundläggande rättigheterna stärkas.',
    },
    names: { en: 'Freedom', fi: 'Vapaus', sv: 'Frihet' },
    pageTitle: {
        en: 'Freedom held secure in the age of AI',
        fi: 'Vapaus varmaksi tekoälyn aikakaudella',
        sv: 'Frihet som tryggas i AI-erans Finland',
    },
    slugs: { en: 'freedom', fi: 'vapaus', sv: 'frihet' },
    updatedDate: '2026-10-02',
}
