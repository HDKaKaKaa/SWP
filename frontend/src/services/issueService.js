import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/issues';

/* =======================
 * CREATE
 * ======================= */
export const createIssue = async (payload) => {
    // payload phải có accountId
    const res = await axios.post(API_BASE_URL, payload);
    return res.data;
};

/* =======================
 * LIST
 * ======================= */
export const listIssues = async (actorId, scope = 'MY') => {
    // GET APIs dùng actorId
    const res = await axios.get(API_BASE_URL, {
        params: { actorId, scope },
    });
    return res.data;
};

/* =======================
 * DETAIL
 * ======================= */
export const getIssueDetail = async (issueId, actorId) => {
    const res = await axios.get(`${API_BASE_URL}/${issueId}`, {
        params: { actorId },
    });
    return res.data; // { issue, events }
};

/* =======================
 * MESSAGES
 * ======================= */
export const addIssueMessage = async (issueId, payload) => {
    // payload: { accountId, content }
    const res = await axios.post(`${API_BASE_URL}/${issueId}/messages`, payload);
    return res.data;
};

/* =======================
 * ATTACHMENTS
 * ======================= */
export const addIssueAttachment = async (issueId, payload) => {
    // payload: { accountId, attachmentUrl, content }
    const res = await axios.post(`${API_BASE_URL}/${issueId}/attachments`, payload);
    return res.data;
};

/* =======================
 * STATUS (optional – nếu FE dùng)
 * ======================= */
export const changeIssueStatus = async (issueId, payload) => {
    // payload: { accountId, status }
    const res = await axios.patch(`${API_BASE_URL}/${issueId}/status`, payload);
    return res.data;
};

/* =======================
 * OWNER REFUND
 * ======================= */
export const ownerRefundDecision = async (issueId, payload) => {
    // payload: { accountId, decision, amount?, note? }
    const res = await axios.post(`${API_BASE_URL}/${issueId}/owner-refund`, payload);
    return res.data;
};

/* =======================
 * ADMIN CREDIT
 * ======================= */
export const adminCreditDecision = async (issueId, payload) => {
    // payload: { accountId, decision: APPROVED|REJECTED, amount?, note? }
    const res = await axios.post(`${API_BASE_URL}/${issueId}/admin-credit`, payload);
    return res.data;
};
