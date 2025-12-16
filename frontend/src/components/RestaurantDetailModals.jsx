import React from 'react';
import { Modal } from 'antd';

/** Modal: Yêu cầu đăng nhập */
export const LoginModal = ({ open, onClose, onLogin }) => (
    <Modal
        open={open}
        title="Đăng nhập để tiếp tục"
        onOk={onLogin}
        onCancel={onClose}
        okText="Đăng nhập ngay"
        cancelText="Để sau"
    >
        <p>Bạn cần đăng nhập để đặt món và quản lý giỏ hàng.</p>
    </Modal>
);

/** Modal: Yêu cầu cập nhật địa chỉ giao hàng */
export const AddressModal = ({ open, onClose, onGoProfile }) => (
    <Modal
        open={open}
        title="Cập nhật địa chỉ giao hàng"
        onOk={onGoProfile}
        onCancel={onClose}
        okText="Cập nhật ngay"
        cancelText="Để sau"
    >
        <p>
            Bạn chưa cập nhật địa chỉ giao hàng. Vui lòng nhập địa chỉ trước khi đặt món
            để chúng tôi có thể giao hàng cho bạn.
        </p>
    </Modal>
);

/** Modal: Lỗi khi thêm vào giỏ */
export const ErrorModal = ({ open, onClose }) => (
    <Modal
        open={open}
        title="Lỗi khi thêm vào giỏ"
        onOk={onClose}
        onCancel={onClose}
        okText="Đóng"
        cancelButtonProps={{ style: { display: 'none' } }}
    >
        <p>Không thêm được món vào giỏ. Vui lòng thử lại sau.</p>
    </Modal>
);

/** Modal: Chọn options khi THÊM món */
export const OptionModal = ({
                                open,
                                product,
                                tmpSelections,
                                buildOptionGroups,
                                isMultiAttribute,
                                toggleOption,
                                formatPrice,
                                onOk,
                                onCancel,
                            }) => (
    <Modal
        open={open}
        title={product ? `Tuỳ chọn cho ${product.name}` : 'Tuỳ chọn món'}
        onOk={onOk}
        onCancel={onCancel}
        okText="Xác nhận"
        cancelText="Huỷ"
        className="option-modal"
    >
        {product ? (
            <div className="option-modal-body">
                {buildOptionGroups(product).map((group) => {
                    const attr = group.attribute;
                    const multi = isMultiAttribute(attr);
                    const selectedIds = tmpSelections[attr.id]?.values || [];

                    return (
                        <div className="option-group" key={attr.id}>
                            <div className="option-group-header">
                                <span className="option-group-title">{attr.name}</span>
                                <span className="option-group-type">
                                    {multi ? 'Chọn nhiều' : 'Chọn 1'}
                                </span>
                            </div>
                            <div className="option-items">
                                {group.options.map((detail) => {
                                    const priceAdj = detail.priceAdjustment ?? 0;
                                    const isSelected = selectedIds.includes(detail.id);

                                    return (
                                        <button
                                            type="button"
                                            key={detail.id}
                                            className={
                                                'option-item' +
                                                (isSelected ? ' option-item-selected' : '')
                                            }
                                            onClick={() => toggleOption(attr, detail)}
                                        >
                                            <span className="option-item-label">
                                                {detail.value}
                                            </span>
                                            {Number(priceAdj) > 0 && (
                                                <span className="option-item-price">
                                                    +{formatPrice(priceAdj)}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        ) : (
            <p>Đang tải tuỳ chọn...</p>
        )}
    </Modal>
);

/** Modal: Chọn combo cần TRỪ khi 1 món có >= 2 options khác nhau */
export const DecreaseComboModal = ({
                                       open,
                                       product,
                                       cartItemsByProduct,
                                       formatPrice,
                                       addingProductId,
                                       onDecreaseOne,   // (cartItem) => void
                                       onClose,
                                   }) => (
    <Modal
        open={open}
        title={
            product
                ? `Giảm số lượng "${product.name}"`
                : 'Chọn combo cần trừ'
        }
        onCancel={onClose}
        footer={null}
    >
        {product ? (
            (() => {
                const productItems = cartItemsByProduct[product.id] || [];
                if (!productItems.length) {
                    return <p>Không tìm thấy combo nào cho món này.</p>;
                }
                return (
                    <div className="option-modal-body">
                        {productItems.map((item) => {
                            const optionText =
                                item.options && item.options.length
                                    ? item.options
                                        .map((o) =>
                                            o.attributeName
                                                ? `${o.attributeName}: ${o.value}`
                                                : o.value
                                        )
                                        .join(', ')
                                    : 'Không có tuỳ chọn';

                            return (
                                <div
                                    key={item.itemId}
                                    className="option-group"
                                    style={{ marginBottom: 8 }}
                                >
                                    <div className="option-group-header">
                                        <span className="option-group-title">
                                            {optionText}
                                        </span>
                                        <span className="option-group-type">
                                            x{item.quantity} – {formatPrice(item.unitPrice)}
                                            /phần
                                        </span>
                                    </div>
                                    <div className="option-items">
                                        <button
                                            type="button"
                                            className="option-item"
                                            onClick={() => onDecreaseOne(item)}
                                            disabled={addingProductId === item.productId}
                                        >
                                            <span className="option-item-label">
                                                Bỏ lựa chọn
                                            </span>
                                            <span className="option-item-price">
                                                −{formatPrice(item.unitPrice)}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            })()
        ) : (
            <p>Đang tải dữ liệu...</p>
        )}
    </Modal>
);