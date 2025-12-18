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

/** Modal: Quản lý combo (tăng / giảm / chỉnh số lượng / thêm option mới) */
export const DecreaseComboModal = ({
                                       open,
                                       product,
                                       cartItemsByProduct,
                                       formatPrice,
                                       addingProductId,

                                       onIncreaseOne,        // (cartItem) => void
                                       onDecreaseOne,        // (cartItem) => void
                                       onUpdateQuantity,     // (cartItem, quantity) => void
                                       onAddNewOption,       // () => void
                                       onClose,
                                   }) => {
    const [draftQty, setDraftQty] = React.useState({}); // itemId -> string

    // sync draft khi mở modal / đổi product / list item thay đổi
    React.useEffect(() => {
        if (!open || !product) {
            setDraftQty({});
            return;
        }
        const items = cartItemsByProduct?.[product.id] || [];
        const next = {};
        items.forEach((it) => {
            next[it.itemId] = String(it.quantity ?? 1);
        });
        setDraftQty(next);
    }, [open, product?.id, cartItemsByProduct]);

    const commitQty = (item) => {
        const raw = draftQty[item.itemId];

        const val = raw === '' ? NaN : Number(raw);
        // chỉ reject NaN hoặc <0
        if (!Number.isFinite(val) || val < 0) {
            setDraftQty((prev) => ({ ...prev, [item.itemId]: String(item.quantity ?? 1) }));
            return;
        }

        const nextQty = Math.floor(val);
        if (nextQty === (item.quantity ?? 1)) return;

        onUpdateQuantity(item, nextQty);
    };

    return (
        <Modal
            open={open}
            title={product ? `Quản lý "${product.name}"` : 'Quản lý combo'}
            onCancel={onClose}
            footer={null}
        >
            {product ? (() => {
                const productItems = cartItemsByProduct?.[product.id] || [];
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
                                    style={{ marginBottom: 12 }}
                                >
                                    <div className="option-group-header">
                                        <span className="option-group-title">
                                            {optionText}
                                        </span>
                                        <span className="option-group-type">
                                            {formatPrice(item.unitPrice)} / phần
                                        </span>
                                    </div>

                                    <div
                                        className="option-items"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                        }}
                                    >
                                        <button
                                            type="button"
                                            className="menu-qty-btn"
                                            onClick={() => onDecreaseOne(item)}
                                            disabled={addingProductId === item.productId}
                                        >
                                            −
                                        </button>

                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={draftQty[item.itemId] ?? String(item.quantity ?? 1)}
                                            onChange={(e) => {
                                                const next = e.target.value;
                                                // cho phép rỗng hoặc toàn số
                                                if (next === '' || /^\d+$/.test(next)) {
                                                    setDraftQty((prev) => ({
                                                        ...prev,
                                                        [item.itemId]: next,
                                                    }));
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    commitQty(item);
                                                } else if (e.key === 'Escape') {
                                                    // ESC -> revert về số cũ
                                                    setDraftQty((prev) => ({
                                                        ...prev,
                                                        [item.itemId]: String(item.quantity ?? 1),
                                                    }));
                                                    e.currentTarget.blur();
                                                }
                                            }}
                                            onBlur={() => {
                                                // bạn yêu cầu Enter mới xác nhận => blur không commit
                                                // nếu user để rỗng rồi blur -> revert
                                                const raw = draftQty[item.itemId];
                                                if (raw === '') {
                                                    setDraftQty((prev) => ({
                                                        ...prev,
                                                        [item.itemId]: String(item.quantity ?? 1),
                                                    }));
                                                }
                                            }}
                                            className="combo-qty-input"
                                        />

                                        <button
                                            type="button"
                                            className="menu-qty-btn"
                                            onClick={() => onIncreaseOne(item)}
                                            disabled={addingProductId === item.productId}
                                        >
                                            +
                                        </button>

                                        <span
                                            style={{
                                                marginLeft: 'auto',
                                                fontSize: 13,
                                                fontWeight: 500,
                                                color: '#8c8c8c',
                                            }}
                                        >
                                            x{item.quantity}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}

                        <button
                            type="button"
                            className="btn-add-primary"
                            style={{ width: '100%', marginTop: 12 }}
                            onClick={onAddNewOption}
                        >
                            + Thêm lựa chọn mới
                        </button>
                    </div>
                );
            })() : (
                <p>Đang tải dữ liệu...</p>
            )}
        </Modal>
    );
};
