import { get, set, del } from 'idb-keyval';

/**
 * Get a specific case from IndexedDB
 * @param {string} id Case ID
 * @returns {Promise<Object|undefined>} The case data, or undefined if not found
 */
export const getCaseDb = async (id) => {
    return await get(`dfm_ninja_case_${id}`);
};

/**
 * Save a specific case to IndexedDB
 * @param {string} id Case ID
 * @param {Object} caseData The full case data object
 * @returns {Promise<void>}
 */
export const saveCaseDb = async (id, caseData) => {
    return await set(`dfm_ninja_case_${id}`, caseData);
};

/**
 * Delete a specific case from IndexedDB
 * @param {string} id Case ID
 * @returns {Promise<void>}
 */
export const deleteCaseDb = async (id) => {
    return await del(`dfm_ninja_case_${id}`);
};
