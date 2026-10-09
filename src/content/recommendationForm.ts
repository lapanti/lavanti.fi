/**
 * Strings for the recommendation form (`src/components/RecommendationForm.astro`).
 * Finnish only: the form has no sv/en pages (spec: .agents/specs/recommendations/submission-form.md).
 */
export const recommendationFormContent = {
    /* Retention (three months for unpublished submissions) is stated in the privacy notice. */
    consent: {
        after: '',
        before: 'Suostun siihen, että Lauri Lavannin vaalikampanja käsittelee antamiani tietoja ja julkaisee nimeni, tittelini, kuvani ja suositukseni lavanti.fi-sivustolla. Suositus kertoo poliittisesta kannastani. Minulla on oikeus käyttää lähettämääni kuvaa. ',
        linkText: 'Lue tietosuojaseloste.',
    },
    /** Shown above the form when the function sends the visitor back with ?virhe=<code>. */
    errors: {
        consent: 'Suosituksen julkaiseminen tarvitsee suostumuksesi.',
        lomake: 'Lomakkeen lähetys epäonnistui. Yritä uudelleen.',
        name: 'Kirjoita nimesi.',
        palvelu:
            'Suosituksen lähettäminen ei juuri nyt onnistu. Yritä hetken päästä uudelleen tai lähetä viesti osoitteeseen lauri@lavanti.fi.',
        photo: 'Valitse kuva uudelleen: JPEG-, PNG- tai WebP-kuva, enintään 10 Mt.',
        recommendation: 'Kirjoita suositus, 20–800 merkkiä.',
        title_en: 'Englanninkielinen titteli saa olla enintään 100 merkkiä.',
        title_fi: 'Kirjoita tittelisi.',
        title_sv: 'Ruotsinkielinen titteli saa olla enintään 100 merkkiä.',
        varmistus: 'Varmistus epäonnistui. Yritä uudelleen.',
    } as Record<string, string>,
    name: 'Nimi',
    photo: 'Kuva itsestäsi',
    photoButton: 'Valitse kuva',
    photoHint: 'Kasvokuva toimii parhaiten. Se rajataan neliöksi kasvojen mukaan. JPEG, PNG tai WebP, enintään 10 Mt.',
    photoNone: 'Ei kuvaa valittuna',
    privacyHref: '/fi/tietosuoja/',
    recommendation: 'Suositus',
    recommendationHint: 'Miksi suosittelet Lauria? 20–800 merkkiä.',
    /** Explains the asterisk; shown above the first field. */
    requiredNote: 'Tähdellä (*) merkityt kohdat ovat pakollisia. Muut voit jättää tyhjiksi.',
    submit: 'Lähetä suositus',
    /** Under the submit button while a required field is still missing. */
    submitHint: 'Täytä nimi, titteli ja suositus, valitse kuva ja anna suostumuksesi, niin voit lähettää lomakkeen.',
    titleEn: 'Titteli englanniksi',
    titleFi: 'Titteli',
    titleFiHint: 'Esimerkiksi ammatti, tehtävä tai luottamustoimi, kuten ”Toimitusjohtaja, Yritys Oy”.',
    titleSv: 'Titteli ruotsiksi',
    translations: 'Haluatko antaa tittelisi myös ruotsiksi tai englanniksi?',
}
