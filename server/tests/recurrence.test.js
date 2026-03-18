import { describe, it, expect } from 'vitest'
import { calculateNextOccurrence } from '../src/utils/recurrenceUtils.js'
import { addDays, addWeeks, addMonths, addYears } from 'date-fns'

describe('Recurrence Utils', () => {
    const baseDate = new Date('2026-03-17T10:00:00')

    it('should calculate daily recurrence', () => {
        const next = calculateNextOccurrence(baseDate, 'daily', { interval: 1 })
        expect(next).toEqual(addDays(baseDate, 1))
    })

    it('should calculate daily recurrence with interval', () => {
        const next = calculateNextOccurrence(baseDate, 'daily', { interval: 3 })
        expect(next).toEqual(addDays(baseDate, 3))
    })

    it('should calculate weekly recurrence', () => {
        const next = calculateNextOccurrence(baseDate, 'weekly', { interval: 1 })
        expect(next).toEqual(addWeeks(baseDate, 1))
    })

    it('should calculate weekly recurrence on specific days (next day in current week)', () => {
        // 2026-03-17 is Tuesday (Day 2)
        // Set to occur on Wednesday (Day 3)
        const next = calculateNextOccurrence(baseDate, 'weekly', { daysOfWeek: [3] })
        expect(next.getDay()).toBe(3)
        expect(next).toEqual(addDays(baseDate, 1))
    })

    it('should calculate weekly recurrence on specific days (jump to next week)', () => {
        // 2026-03-17 is Tuesday (Day 2)
        // Set to occur on Monday (Day 1)
        const next = calculateNextOccurrence(baseDate, 'weekly', { daysOfWeek: [1], interval: 1 })
        expect(next.getDay()).toBe(1)
        expect(next).toEqual(addDays(baseDate, 6)) // Next Monday
    })

    it('should calculate monthly recurrence', () => {
        const next = calculateNextOccurrence(baseDate, 'monthly', { interval: 1 })
        expect(next).toEqual(addMonths(baseDate, 1))
    })

    it('should calculate yearly recurrence', () => {
        const next = calculateNextOccurrence(baseDate, 'yearly', { interval: 1 })
        expect(next).toEqual(addYears(baseDate, 1))
    })
})
