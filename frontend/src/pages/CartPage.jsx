import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getCart, updateCartItemByItemId } from '../services/cartService';
import { MdRestaurant } from "react-icons/md";
import { HiLocationMarker } from "react-icons/hi";
import { message } from 'antd';
import '../css/CartPage.css';

const CartPage = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    // restaurantId của quán đang đặt (truyền từ RestaurantDetail)
    const initialRestaurantId = location.state?.restaurantId || null;
    const [restaurantId] = useState(initialRestaurantId);

    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState(null);
    const [note, setNote] = useState('');
    const [noteError, setNoteError] = useState('');

    // Validate textbox giống CustomerIssueCreate (maxLength + không nhận toàn khoảng trắng)
    const NOTE_MAX_LENGTH = 300;


    const MAX_PER_PRODUCT = 100;
    const LARGE_ORDER_THRESHOLD = 10;

    const [messageApi, contextHolder] = message.useMessage();
    const largeOrderWarnedRef = useRef({}); // productId -> true
    const prevQtyMapRef = useRef({});       // productId -> tổng qty trước đó
    const initializedQtyRef = useRef(false); // tránh warn ngay khi load lần đầu

    const buildQtyMapFromItems = (items = []) => {
        const map = {};
        (items || []).forEach((it) => {
            if (!it?.productId) return;
            const pid = String(it.productId);
            map[pid] = (map[pid] || 0) + (Number(it.quantity) || 0);
        });
        return map;
    };

    const warnIfCrossLargeOrder = (nextQtyMap, allowWarn = true) => {
        const prev = prevQtyMapRef.current || {};
        const warned = largeOrderWarnedRef.current || {};

        // reset flag nếu qty <= 10
        Object.keys(warned).forEach((pid) => {
            const q = Number(nextQtyMap[pid] ?? 0);
            if (q <= LARGE_ORDER_THRESHOLD) delete warned[pid];
        });

        if (allowWarn) {
            Object.entries(nextQtyMap).forEach(([pid, qRaw]) => {
                const nextQ = Number(qRaw ?? 0);
                const prevQ = Number(prev[pid] ?? 0);

                if (prevQ <= LARGE_ORDER_THRESHOLD && nextQ > LARGE_ORDER_THRESHOLD && !warned[pid]) {
                    warned[pid] = true;
                    messageApi.open({
                        type: 'warning',
                        duration: 6,
                        content: 'Bạn đang đặt số lượng lớn. Chủ quán sẽ gọi điện xác nhận đơn trước khi chuẩn bị.',
                    });
                }
            });
        }

        prevQtyMapRef.current = nextQtyMap;
    };

    const syncCartState = (nextCart, allowWarn = false) => {
        setCart(nextCart);
        const nextMap = buildQtyMapFromItems(nextCart?.items || []);

        if (!initializedQtyRef.current) {
            prevQtyMapRef.current = nextMap;  // lần đầu: chỉ set mốc
            initializedQtyRef.current = true;
            return;
        }

        warnIfCrossLargeOrder(nextMap, allowWarn);
    };

    const handleNoteChange = (e) => {
        let v = e.target.value ?? '';
        if (v.length > NOTE_MAX_LENGTH) v = v.slice(0, NOTE_MAX_LENGTH);
        setNote(v);
        if (noteError) setNoteError('');
    };

    const handleNoteBlur = () => {
        // nếu user chỉ nhập khoảng trắng => coi như rỗng
        if ((note || '').trim() === '' && note !== '') {
            setNote('');
        }
    };

    const MAX_PER_PRODUCT = 100;
    const LARGE_ORDER_THRESHOLD = 10;

    const [messageApi, contextHolder] = message.useMessage();
    const largeOrderWarnedRef = useRef({}); // productId -> true
    const prevQtyMapRef = useRef({});       // productId -> tổng qty trước đó
    const initializedQtyRef = useRef(false); // tránh warn ngay khi load lần đầu

    const buildQtyMapFromItems = (items = []) => {
        const map = {};
        (items || []).forEach((it) => {
            if (!it?.productId) return;
            const pid = String(it.productId);
            map[pid] = (map[pid] || 0) + (Number(it.quantity) || 0);
        });
        return map;
    };

    const warnIfCrossLargeOrder = (nextQtyMap, allowWarn = true) => {
        const prev = prevQtyMapRef.current || {};
        const warned = largeOrderWarnedRef.current || {};

        // reset flag nếu qty <= 10
        Object.keys(warned).forEach((pid) => {
            const q = Number(nextQtyMap[pid] ?? 0);
            if (q <= LARGE_ORDER_THRESHOLD) delete warned[pid];
        });

        if (allowWarn) {
            Object.entries(nextQtyMap).forEach(([pid, qRaw]) => {
                const nextQ = Number(qRaw ?? 0);
                const prevQ = Number(prev[pid] ?? 0);

                if (prevQ <= LARGE_ORDER_THRESHOLD && nextQ > LARGE_ORDER_THRESHOLD && !warned[pid]) {
                    warned[pid] = true;
                    messageApi.open({
                        type: 'warning',
                        duration: 6,
                        content: 'Bạn đang đặt số lượng lớn. Chủ quán sẽ gọi điện xác nhận đơn trước khi chuẩn bị.',
                    });
                }
            });
        }

        prevQtyMapRef.current = nextQtyMap;
    };

    const syncCartState = (nextCart, allowWarn = false) => {
        setCart(nextCart);
        const nextMap = buildQtyMapFromItems(nextCart?.items || []);

        if (!initializedQtyRef.current) {
            prevQtyMapRef.current = nextMap;  // lần đầu: chỉ set mốc
            initializedQtyRef.current = true;
            return;
        }

        warnIfCrossLargeOrder(nextMap, allowWarn);
    };

    const formatPrice = (v) => {
        if (v === null || v === undefined) return '0 đ';
        try {
            const num = typeof v === 'number' ? v : Number(v);
            if (Number.isNaN(num)) return `${v} đ`;
            return num.toLocaleString('vi-VN') + ' đ';
        } catch {
            return `${v} đ`;
        }
    };

    const hasItems = cart && cart.items && cart.items.length > 0;

    const totalItems = useMemo(
        () =>
            cart && cart.items
                ? cart.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
                : 0,
        [cart]
    );

    const qtyMapByProduct = useMemo(() => buildQtyMapFromItems(cart?.items || []), [cart]);
    const hasLargeOrder = useMemo(
        () => Object.values(qtyMapByProduct).some((q) => Number(q || 0) > LARGE_ORDER_THRESHOLD),
        [qtyMapByProduct]
    );


    // ===== Helpers hiển thị options từ backend =====
    // Giả định CartItemResponse có field: options: Array<{ attributeName, value }>
    const getOptionsText = (item) => {
        const opts = item?.options;
        if (!Array.isArray(opts) || opts.length === 0) return '';

        // group theo attributeName
        const grouped = opts.reduce((acc, o) => {
            const key = (o?.attributeName || '').trim() || 'Tùy chọn';
            const val = (o?.value || '').trim();
            if (!val) return acc;

            if (!acc[key]) acc[key] = [];
            if (!acc[key].includes(val)) acc[key].push(val); // tránh trùng
            return acc;
        }, {});

        // output: "Thêm topping: ruốc, hành phi, dưa góp, trứng, Nhiệt độ: Lạnh"
        return Object.entries(grouped)
            .map(([attr, values]) => `${attr}: ${values.join(', ')}`)
            .join(', ');
    };

    useEffect(() => {
        window.scrollTo(0, 0);

        if (!user) {
            setLoading(false);
            return;
        }

        // Không có restaurantId => không biết đang đặt quán nào
        if (!restaurantId) {
            setLoading(false);
            setError(
                'Không xác định được nhà hàng đang đặt món. Vui lòng quay lại chọn món từ nhà hàng.'
            );
            return;
        }

        const fetchCart = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await getCart(user.id, restaurantId);
                syncCartState(data, false);
            } catch (err) {
                console.error(err);
                setError('Không tải được giỏ hàng. Vui lòng thử lại.');
            } finally {
                setLoading(false);
            }
        };

        fetchCart();
    }, [user, restaurantId]);

    // Khi quay lại trang (Back, mouse button 4, Alt+←, v.v.) thì reload lại giỏ hàng để cập nhật địa chỉ mới
    useEffect(() => {
       const handleFocusOrShow = () => {
           if (!user || !restaurantId) return;

           getCart(user.id, restaurantId)
               .then((data) => {
                   syncCartState(data, false);
               })
               .catch((err) => {
                   console.error(err);
               });
       };

       window.addEventListener('focus', handleFocusOrShow);
       window.addEventListener('pageshow', handleFocusOrShow);

       return () => {
           window.removeEventListener('focus', handleFocusOrShow);
           window.removeEventListener('pageshow', handleFocusOrShow);
       };
    }, [user, restaurantId]);

    const handleChangeQuantity = async (item, delta) => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (!restaurantId && !cart?.restaurantId) {
            messageApi.error('Không xác định được nhà hàng. Vui lòng quay lại chọn món.');
            return;
        }

        const currentQty = item.quantity || 0;
        const newQuantity = currentQty + delta;
        if (newQuantity < 0) return;

        // Tổng theo productId (vì có thể nhiều combo/options cho cùng 1 món)
        const pid = item?.productId;
        const currentTotalOfProduct = (cart?.items || [])
            .filter((it) => it?.productId === pid)
            .reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

        const nextTotalOfProduct =
            currentTotalOfProduct - (Number(currentQty) || 0) + (Number(newQuantity) || 0);

        if (nextTotalOfProduct > MAX_PER_PRODUCT) {
            messageApi.warning(`Bạn chỉ có thể đặt tối đa ${MAX_PER_PRODUCT} phần cho một món.`);
            return;
        }

        try {
            setUpdating(true);

            const data = await updateCartItemByItemId({
                accountId: user.id,
                itemId: item.itemId,
                quantity: newQuantity,
                restaurantId: cart?.restaurantId || restaurantId || null,
            });

            // allowWarn=true: chỉ warn khi user “thay đổi món” ở CartPage
            syncCartState(data, true);
        } catch (err) {
            console.error(err);
            messageApi.error('Không cập nhật được số lượng. Vui lòng thử lại.');
        } finally {
            setUpdating(false);
        }
    };

    const handlePlaceOrder = () => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (!hasItems) return;

        const safeNote = (note || '').trim();
        if (safeNote.length > NOTE_MAX_LENGTH) {
            setNoteError(`Ghi chú không được quá ${NOTE_MAX_LENGTH} ký tự.`);
            messageApi.error('Vui lòng kiểm tra lại ghi chú cho quán.');
            return;
        }

        // Flow: Cart -> Checkout -> PayOS
        navigate('/checkout', {
            state: {
                cartId: cart?.orderId || null,
                restaurantId: cart?.restaurantId || restaurantId || null,
                note: note || '',
            },
        });
    };

    const handleChangeAddress = () => {
        navigate('/profile', {
            state: { returnTo: { path: location.pathname, state: location.state } }
        });

    };

    const handleBackToRestaurant = () => {
        const resId = cart?.restaurantId || restaurantId;
        if (resId) {
            navigate(`/restaurant/${resId}`);
        } else {
            navigate('/');
        }
    };

    const shippingFee = cart?.shippingFee ?? 0;
    const subtotal = cart?.subtotal ?? 0;
    const total = cart?.total ?? subtotal + shippingFee;

    // ======= Các trạng thái đặc biệt =======
    if (!user) {
        return (
            <div className="cart-page">
                {contextHolder}
                <div className="cart-wrapper">
                    <h1 className="cart-page-title">Xác nhận đơn hàng</h1>
                    <div className="cart-empty-card">
                        <p className="cart-empty-text">
                            Bạn cần đăng nhập để xem giỏ hàng và đặt món.
                        </p>
                        <button
                            type="button"
                            className="cart-login-btn"
                            onClick={() => navigate('/login')}
                        >
                            Đăng nhập ngay
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="cart-page">
                <div className="cart-wrapper">
                    <h1 className="cart-page-title">Xác nhận đơn hàng</h1>
                    <div className="cart-empty-card">
                        <p className="cart-loading-text">Đang tải giỏ hàng...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Không có restaurantId => show thông báo
    if (!restaurantId && !cart?.restaurantId) {
        return (
            <div className="cart-page">
                <div className="cart-wrapper">
                    <h1 className="cart-page-title">Xác nhận đơn hàng</h1>
                    <div className="cart-empty-card">
                        <p className="cart-empty-text">
                            Không xác định được nhà hàng đang đặt món. Vui lòng quay lại chọn món từ nhà hàng.
                        </p>
                        <button
                            type="button"
                            className="cart-back-btn"
                            onClick={() => navigate('/')}
                        >
                            Về trang chủ
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!hasItems) {
        return (
            <div className="cart-page">
                <div className="cart-wrapper">
                    <h1 className="cart-page-title">Xác nhận đơn hàng</h1>
                    <div className="cart-empty-card">
                        <p className="cart-empty-text">
                            Giỏ hàng của bạn đang trống. Hãy quay lại chọn món nhé!
                        </p>
                        <button
                            type="button"
                            className="cart-back-btn"
                            onClick={handleBackToRestaurant}
                        >
                            Quay lại chọn món
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="cart-page">
            <div className="cart-wrapper">
                {/* Tiêu đề */}
                <h1 className="cart-page-title">Xác nhận đơn hàng</h1>

                {/* Nút quay lại chọn món */}
                <div className="cart-back-row">
                    <button
                        type="button"
                        className="cart-back-btn"
                        onClick={handleBackToRestaurant}
                    >
                        ← Quay lại chọn món
                    </button>
                </div>

                {/* Địa chỉ giao hàng */}
                <section className="cart-address-card">
                    <div className="cart-address-left">
                        <HiLocationMarker className="cart-address-icon" />

                        <div className="cart-address-text">
                            <span className="cart-address-label">Địa chỉ giao hàng</span>
                            <div className="cart-address-value">
                                {cart?.shippingAddress || 'Chưa có địa chỉ giao hàng'}
                            </div>
                        </div>
                    </div>
                    <div className="cart-address-right">
                        <button
                            type="button"
                            className="cart-address-change-btn"
                            onClick={handleChangeAddress}
                        >
                            Thay đổi
                        </button>
                    </div>
                </section>

                {/* Nội dung chính: Giỏ hàng (trái) + Chi tiết thanh toán (phải) */}
                <div className="cart-content">
                    {/* Cột trái: giỏ hàng */}
                    <main className="cart-main">
                        <section className="cart-items-card">
                            <header className="cart-restaurant-header">
                                <div className="cart-res-avatar">
                                    <MdRestaurant className="cart-res-avatar-icon" />
                                </div>
                                <div className="cart-res-info">
                                    <div className="cart-res-name">
                                        {cart?.restaurantName || 'Quán ăn'}
                                    </div>
                                    <div className="cart-res-meta">
                                        {cart?.restaurantAddress || 'Địa chỉ quán chưa cập nhật'}
                                    </div>
                                </div>
                            </header>

                            <div className="cart-items-list">
                                {cart.items.map((item) => {
                                    const optionsText = getOptionsText(item);

                                    return (
                                        <div
                                            key={item.itemId || item.productId}
                                            className="cart-item-row"
                                        >
                                            <div className="cart-item-left">
                                                <div className="cart-item-thumb">
                                                    {item.productImage ? (
                                                        <img
                                                            src={item.productImage}
                                                            alt={item.productName}
                                                            className="cart-item-thumb-img"
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = 'none';
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="cart-item-thumb-placeholder">
                                                            <span className="cart-item-thumb-placeholder-text">
                                                                {item.productName.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="cart-item-info">
                                                    <div className="cart-item-name">
                                                        {item.productName}
                                                    </div>

                                                    {/* Dòng hiển thị options */}
                                                    {optionsText && (
                                                        <div className="cart-item-options">
                                                            {optionsText}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="cart-item-right">
                                                <div className="cart-qty-control">
                                                    <button
                                                        type="button"
                                                        className="cart-qty-btn"
                                                        onClick={() => handleChangeQuantity(item, -1)}
                                                        disabled={updating}
                                                    >
                                                        −
                                                    </button>
                                                    <span className="cart-qty-value">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="cart-qty-btn"
                                                        onClick={() => handleChangeQuantity(item, +1)}
                                                        disabled={updating}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <div className="cart-item-total">
                                                    {formatPrice(item.lineTotal)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </main>

                    {/* Cột phải: Chi tiết thanh toán + Ghi chú */}
                    <aside className="cart-sidebar">
                        <section className="cart-summary-card">
                            <h2 className="cart-summary-title">Chi tiết thanh toán</h2>

                            <div className="cart-summary-row">
                                <span>
                                    Tổng giá món
                                    {totalItems > 0 ? ` (${totalItems} món)` : ''}
                                </span>
                                <span>{formatPrice(subtotal)}</span>
                            </div>

                            <div className="cart-summary-row">
                                <span>Phí giao hàng</span>
                                <span>{formatPrice(shippingFee)}</span>
                            </div>

                            <div className="cart-summary-total-row">
                                <span>Tổng thanh toán</span>
                                <span className="cart-summary-total-value">
                                    {formatPrice(total)}
                                </span>
                            </div>
                            <div className="cart-summary-tax-note">Đã bao gồm thuế</div>

                            <button
                                type="button"
                                className="cart-place-order-btn"
                                disabled={!hasItems || updating}
                                onClick={handlePlaceOrder}
                            >
                                Đặt đơn - {formatPrice(total)}
                            </button>
                            {hasLargeOrder && (
                                <div className="cart-large-order-note">
                                    Đơn hàng số lượng lớn: quán có thể gọi điện xác nhận trước khi chuẩn bị.
                                </div>
                            )}
                        </section>

                        <section className="cart-note-card">
                            <div className="cart-note-header">
                                <span>Ghi chú cho quán</span>
                            </div>
                            <textarea
                                className="cart-note-input"
                                rows={3}
                                placeholder="Ví dụ: Không hành, ít đá, gọi trước khi giao..."
                                value={note}
                                maxLength={NOTE_MAX_LENGTH}
                                onChange={handleNoteChange}
                                onBlur={handleNoteBlur}
                            />
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: 6,
                                fontSize: 12,
                            }}>
                              <span style={{ color: noteError ? '#d32' : '#666' }}>
                                {noteError || ' '}
                              </span>
                              <span style={{ color: '#666' }}>
                                {note.length}/{NOTE_MAX_LENGTH}
                              </span>
                            </div>
                        </section>
                    </aside>
                </div>

                {error && <p className="cart-error-text">{error}</p>}
            </div>
        </div>
    );
};

export default CartPage;