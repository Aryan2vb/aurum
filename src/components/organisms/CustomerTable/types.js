// Customer data types - JSDoc type definitions for IDE support

/**
 * @typedef {'ACTIVE' | 'INACTIVE' | 'CLOSED' | 'SUSPENDED'} CustomerStatus
 */

/**
 * @typedef {'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY'} Gender
 */

/**
 * @typedef {'SELF' | 'FAMILY' | 'NEIGHBOR' | 'OTHER'} PhoneOwnerType
 */

/**
 * @typedef {'CALL' | 'WHATSAPP' | 'SMS' | 'VISIT' | 'EMAIL'} ContactMethod
 */

/**
 * @typedef {Object} ContactDetail
 * @property {string} id
 * @property {string} primaryPhone
 * @property {string|null} [secondaryPhone]
 * @property {PhoneOwnerType|null} [phoneOwnerType]
 * @property {ContactMethod|null} [preferredContactMethod]
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} Location
 * @property {string} id
 * @property {string|null} [village]
 * @property {string|null} [tehsil]
 * @property {string|null} [district]
 * @property {string|null} [state]
 * @property {string|null} [pincode]
 * @property {string|null} [landmark]
 */

/**
 * @typedef {Object} CreatedByUser
 * @property {string} id
 * @property {string} email
 * @property {string|null} [fullName]
 */

/**
 * @typedef {Object} Customer
 * @property {string} id
 * @property {string} customerCode
 * @property {string} fullName
 * @property {string|null} [fatherName]
 * @property {Gender|null} [gender]
 * @property {string|null} [dateOfBirth]
 * @property {boolean} isDobEstimated
 * @property {CustomerStatus} status
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {ContactDetail[]} contactDetails
 * @property {Location[]} locations
 * @property {CreatedByUser|null} [createdBy]
 */

/**
 * @typedef {Object} CustomerFilters
 * @property {string} globalSearch
 * @property {CustomerStatus[]} status
 * @property {Gender[]} gender
 * @property {ContactMethod[]} preferredContact
 * @property {number|null} ageMin
 * @property {number|null} ageMax
 * @property {boolean|null} hasPhone
 * @property {{start: Date|null, end: Date|null}} dateRange
 */

/**
 * @typedef {Object.<string, boolean>} ColumnVisibility
 */

/**
 * @typedef {Object} CustomerAggregations
 * @property {number} totalCount
 * @property {number} activeCount
 * @property {number} inactiveCount
 * @property {number|null} averageAge
 * @property {Object.<CustomerStatus, number>} statusCounts
 */

// Export empty object for module compatibility
export {};
