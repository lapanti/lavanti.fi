import type { Lang } from './nav'

import { artificialIntelligenceTag } from './tags/artificial-intelligence'
import { basicWelfareTag } from './tags/basic-welfare'
import { coopElectionsTag } from './tags/coop-elections'
import { councilMotionTag } from './tags/council-motion'
import { cultureAndEducationTag } from './tags/culture-and-education'
import { digitalIndependenceTag } from './tags/digital-independence'
import { digitalisationTag } from './tags/digitalisation'
import { earlyChildhoodEducationTag } from './tags/early-childhood-education'
import { economyTag } from './tags/economy'
import { educationTag } from './tags/education'
import { enlightenmentTag } from './tags/enlightenment'
import { entrepreneurshipTag } from './tags/entrepreneurship'
import { equalityAndNonDiscriminationTag } from './tags/equality-and-non-discrimination'
import { freedomTag } from './tags/freedom'
import { greenPartyTag } from './tags/green-party'
import { healthAndSocialReformTag } from './tags/health-and-social-reform'
import { immigrationTag } from './tags/immigration'
import { infrastructureTag } from './tags/infrastructure'
import { kirkkonummiTag } from './tags/kirkkonummi'
import { marketgreenTag } from './tags/marketgreen'
import { municipalElections2025Tag } from './tags/municipal-elections-2025'
import { nationalPoliticsTag } from './tags/national-politics'
import { natureTag } from './tags/nature'
import { parliamentaryElections2027Tag } from './tags/parliamentary-elections-2027'
import { privacyTag } from './tags/privacy'
import { regionalElections2022Tag } from './tags/regional-elections-2022'
import { regionalElections2025Tag } from './tags/regional-elections-2025'
import { securityTag } from './tags/security'
import { socialMediaTag } from './tags/social-media'
import { speechTag } from './tags/speech'
import { technologyTag } from './tags/technology'
import { transportationTag } from './tags/transportation'
import { urbanPlanningTag } from './tags/urban-planning'
import { westRailwayTag } from './tags/west-railway'
import { westernUusimaaTag } from './tags/western-uusimaa'

export type { LocalTag } from './tags/types'

export const tags = [
    parliamentaryElections2027Tag,
    regionalElections2022Tag,
    regionalElections2025Tag,
    artificialIntelligenceTag,
    economyTag,
    entrepreneurshipTag,
    marketgreenTag,
    enlightenmentTag,
    freedomTag,
    digitalIndependenceTag,
    digitalisationTag,
    infrastructureTag,
    urbanPlanningTag,
    kirkkonummiTag,
    municipalElections2025Tag,
    westRailwayTag,
    westernUusimaaTag,
    transportationTag,
    immigrationTag,
    educationTag,
    coopElectionsTag,
    basicWelfareTag,
    cultureAndEducationTag,
    socialMediaTag,
    healthAndSocialReformTag,
    equalityAndNonDiscriminationTag,
    technologyTag,
    councilMotionTag,
    speechTag,
    earlyChildhoodEducationTag,
    privacyTag,
    natureTag,
    greenPartyTag,
    nationalPoliticsTag,
    securityTag,
]

export function getTagName(id: string, lang: Lang = 'fi'): string | undefined {
    return tags.find((t) => t.id === id)?.names[lang]
}

/** Localised category-page segment per locale. */
export const CATEGORY_SEGMENTS: Record<Lang, string> = { en: 'category', fi: 'kategoria', sv: 'kategori' }

/** Canonical category-page path for a tag in a locale, e.g. /fi/kategoria/tekoaly/. */
export function getCategoryPath(id: string, lang: Lang): string | undefined {
    const tag = tags.find((t) => t.id === id)

    return tag ? `/${lang}/${CATEGORY_SEGMENTS[lang]}/${tag.slugs[lang]}/` : undefined
}
