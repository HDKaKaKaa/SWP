import React from 'react';
import '../css/ConfirmModal.css';
import { AlertTriangle } from 'lucide-react';

/**
 * Confirm Modal dùng chung
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {function} onConfirm
 * @param {string} title
 * @param {string} message
 * @param {boolean} isLoading
 */
const ConfirmModal = ({
                          isOpen,
                          onClose,
                          onConfirm,
                          title = "Xác nhận",
                          message = "Bạn có chắc chắn muốn thực hiện hành động này?",
                          isLoading = false
                      }) => {

    if (!isOpen) return null;

    return (
        <div className="confirm-modal-overlay">
            <div className="confirm-modal-container">

                {/* Header */}
                <div className="confirm-modal-header">
                    <div className="confirm-modal-icon">
                        <AlertTriangle size={22} />
                    </div>
                    <span className="confirm-modal-title">{title}</span>
                </div>

                {/* Body */}
                <div className="confirm-modal-body">
                    <p>{message}</p>
                </div>

                {/* Footer */}
                <div className="confirm-modal-footer">

                    <button
                        className="confirm-btn-cancel"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Không
                    </button>

                    <button
                        className="confirm-btn-ok"
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading && (
                            <span className="confirm-loading-spinner"></span>
                        )}
                        {isLoading ? "Đang xử lý..." : "Có, xác nhận"}
                    </button>

                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;