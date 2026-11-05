import { describe, expect, it } from 'vitest'

import {
    BLOGPOSTING,
    COLLECTIONPAGE,
    EVENT,
    FAQPAGE,
    JSON_LD_TYPES,
    PERSON,
    PROFILEPAGE,
    WEBPAGE,
    WEBSITE,
} from './jsonld'

describe('jsonld', () => {
    it('should export correct JSON-LD types', () => {
        expect(BLOGPOSTING).toBe('BlogPosting')
        expect(COLLECTIONPAGE).toBe('CollectionPage')
        expect(PERSON).toBe('Person')
        expect(PROFILEPAGE).toBe('ProfilePage')
        expect(WEBPAGE).toBe('WebPage')
        expect(WEBSITE).toBe('WebSite')
    })

    it('should include all JSON-LD types in JSON_LD_TYPES', () => {
        expect(JSON_LD_TYPES).toEqual([BLOGPOSTING, COLLECTIONPAGE, PERSON, PROFILEPAGE, WEBPAGE])
    })

    it('should not include WEBSITE in JSON_LD_TYPES', () => {
        expect(JSON_LD_TYPES).not.toContain(WEBSITE)
    })

    it('should export EVENT constant', () => {
        expect(EVENT).toBe('Event')
    })

    it('should not include EVENT in JSON_LD_TYPES', () => {
        expect(JSON_LD_TYPES).not.toContain(EVENT)
    })

    it('should export FAQPAGE constant', () => {
        expect(FAQPAGE).toBe('FAQPage')
    })

    it('should not include FAQPAGE in JSON_LD_TYPES', () => {
        expect(JSON_LD_TYPES).not.toContain(FAQPAGE)
    })
})
