import { addDays, addWeeks, addMonths, addYears, setDay, setDate, nextDay } from 'date-fns'

/**
 * Calculates the next occurrence date based on a recurrence rule and config.
 * 
 * @param {Date} lastDate - The date of the current/last occurrence
 * @param {string} rule - 'daily', 'weekly', 'monthly', 'yearly'
 * @param {Object} config - { interval: number, daysOfWeek: number[], dayOfMonth: number }
 * @returns {Date} The next occurrence date
 */
export const calculateNextOccurrence = (lastDate, rule, config = {}) => {
    if (!lastDate) lastDate = new Date()
    const interval = Math.max(1, config.interval || 1)
    
    switch (rule) {
        case 'daily':
            return addDays(lastDate, interval)
            
        case 'weekly':
            if (config.daysOfWeek && config.daysOfWeek.length > 0) {
                // Find the next day in the list
                const currentDay = lastDate.getDay()
                const sortedDays = [...config.daysOfWeek].sort((a, b) => a - b)
                const nextDayInWeek = sortedDays.find(d => d > currentDay)
                
                if (nextDayInWeek !== undefined) {
                    return addDays(lastDate, nextDayInWeek - currentDay)
                } else {
                    // Go to the first day of the next week interval
                    const firstDayOfNextWeek = sortedDays[0]
                    const daysUntilNextWeek = 7 - currentDay + firstDayOfNextWeek
                    return addDays(lastDate, daysUntilNextWeek + (interval - 1) * 7)
                }
            }
            return addWeeks(lastDate, interval)
            
        case 'monthly':
            if (config.dayOfMonth) {
                const nextMonth = addMonths(lastDate, interval)
                return setDate(nextMonth, config.dayOfMonth)
            }
            return addMonths(lastDate, interval)
            
        case 'yearly':
            return addYears(lastDate, interval)
            
        default:
            return null
    }
}
