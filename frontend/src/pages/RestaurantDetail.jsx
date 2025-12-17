import { useEffect, useState, useContext, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getRestaurantById, getProductsByRestaurant } from '../services/restaurantPublicService';
import {
    getCart,
    addCartItem,
    updateCartItemByItemId,
    clearCartForRestaurant,
} from '../services/cartService';
import {
    LoginModal,
    AddressModal,
    ErrorModal,
    OptionModal,
    DecreaseComboModal,
} from '../components/RestaurantDetailModals';
import { FiShoppingBag, FiImage } from "react-icons/fi";
import { message } from 'antd';
import '../css/RestaurantDetail.css';

/* ======================= COMPONENT CHÍNH ======================= */

const RestaurantDetail = () => {
    const { id } = useParams();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    const userRole = (user?.role || '').toUpperCase();
    const canOrder = !!user && (userRole === 'CUSTOMER' || userRole === 'OWNER');

    const [restaurant, setRestaurant] = useState(null);
    const [products, setProducts] = useState([]);
    const [addingProductId, setAddingProductId] = useState(null);

    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const [addressModalOpen, setAddressModalOpen] = useState(false);
    const [errorModalOpen, setErrorModalOpen] = useState(false);

    // ==== MODAL CHỌN OPTIONS (khi thêm) ====
    const [optionModalOpen, setOptionModalOpen] = useState(false);
    const [optionProduct, setOptionProduct] = useState(null); // product đang chọn
    // tmpSelections: { [attributeId]: { type: 'single' | 'multi', values: number[] } }
    const [tmpSelections, setTmpSelections] = useState({});

    // ==== MODAL CHỌN COMBO KHI TRỪ ====
    const [decreaseModalOpen, setDecreaseModalOpen] = useState(false);
    const [decreaseProduct, setDecreaseProduct] = useState(null);

    // trạng thái giỏ
    const [cartQuantities, setCartQuantities] = useState({});          // productId -> tổng quantity
    const [cartItemsByProduct, setCartItemsByProduct] = useState({});  // productId -> [cartItem]
    const [brokenImages, setBrokenImages] = useState({});

    const [cartSummary, setCartSummary] = useState({
        subtotal: 0,
        shippingFee: 0,
        total: 0,
    });

    const totalCartItems = useMemo(
        () =>
            Object.values(cartQuantities).reduce(
                (sum, q) => sum + (q || 0),
                0
            ),
        [cartQuantities]
    );

    const MAX_PER_PRODUCT = 100;
    const LARGE_ORDER_THRESHOLD = 10;
    const largeOrderWarnedRef = useRef({}); // productId -> true
    const prevQtyMapRef = useRef({}); // productId -> qty trước đó
    const [messageApi, contextHolder] = message.useMessage();

    const maybeWarnLargeOrder = (productId, nextQty) => {
        const pid = String(productId);
        const q = Number(nextQty ?? 0);

        // Nếu giảm xuống <= 10 thì reset để lần sau vượt lại vẫn warn
        if (q <= LARGE_ORDER_THRESHOLD) {
            delete largeOrderWarnedRef.current[pid];
            return;
        }

        // Đã warn rồi thì thôi
        if (largeOrderWarnedRef.current[pid]) return;

        largeOrderWarnedRef.current[pid] = true;

        messageApi.open({
            type: 'warning',
            duration: 6,
            content: 'Bạn đang đặt số lượng lớn. Chủ quán sẽ gọi điện xác nhận đơn trước khi chuẩn bị.',
        });
    };

    const warnIfCrossLargeOrder = (nextQtyMap) => {
        const prev = prevQtyMapRef.current || {};
        const warned = largeOrderWarnedRef.current;

        // reset warn flag nếu qty <= threshold hoặc product biến mất
        Object.keys(warned).forEach((pid) => {
            const q = Number(nextQtyMap[pid] ?? 0);
            if (q <= LARGE_ORDER_THRESHOLD) {
                delete warned[pid];
            }
        });

        // warn khi "vừa vượt ngưỡng" (prev <= 10 && next > 10)
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

        // cập nhật prev
        prevQtyMapRef.current = nextQtyMap;
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

    // ====== Lưu / đọc options "mặc định" theo productId trong localStorage (cho nút +) ======
    const getCartOptionsKey = () => {
        const uid = user?.id ?? 'guest';
        return `cartOptions_${uid}`;
    };

    const loadAllSavedOptions = () => {
        try {
            const raw = localStorage.getItem(getCartOptionsKey());
            if (!raw) return {};
            return JSON.parse(raw);
        } catch {
            return {};
        }
    };

    const loadProductOptions = (productId) => {
        const all = loadAllSavedOptions();
        return all[productId] || null; // { productId, selections: [...] }
    };

    const saveProductOptions = (productId, selections) => {
        // selections: Array<{ attributeId, attributeName, detailId, value, priceAdjustment }>
        try {
            const all = loadAllSavedOptions();
            all[productId] = {
                productId,
                selections,
            };
            localStorage.setItem(getCartOptionsKey(), JSON.stringify(all));
        } catch (e) {
            console.error('Cannot save cart options to localStorage:', e);
        }
    };

    // --------- Load dữ liệu quán + menu ----------
    useEffect(() => {
        window.scrollTo(0, 0);
        const fetchData = async () => {
            try {
                const [restaurantData, productData] = await Promise.all([
                    getRestaurantById(id),
                    getProductsByRestaurant(id),
                ]);
                setRestaurant(restaurantData);
                setProducts(productData || []);
            } catch (error) {
                console.error(error);
            }
        };

        fetchData();
    }, [id]);

    // --------- Hàm build state giỏ từ response backend ----------
    const buildCartStateFromResponse = (data) => {
        const qtyMap = {};
        const byProduct = {};

        const items = data?.items || [];

        items.forEach((item) => {
            if (!item || !item.productId) return;

            const pid = item.productId;
            const q = Number(item.quantity) || 0;

            qtyMap[pid] = (qtyMap[pid] || 0) + q;

            if (!byProduct[pid]) {
                byProduct[pid] = [];
            }
            byProduct[pid].push(item);
        });

        warnIfCrossLargeOrder(qtyMap);

        // ===== GIỮ THỨ TỰ COMBO CŨ =====
        setCartItemsByProduct((prev) => {
            if (!prev) return byProduct;

            const merged = {};

            Object.keys(byProduct).forEach((pid) => {
                const prevItems = prev[pid] || [];
                const newItems = byProduct[pid];

                // map itemId -> item mới
                const map = new Map(newItems.map(it => [it.itemId, it]));

                // giữ thứ tự cũ
                const ordered = [];
                prevItems.forEach((old) => {
                    if (map.has(old.itemId)) {
                        ordered.push(map.get(old.itemId));
                        map.delete(old.itemId);
                    }
                });

                // item mới (nếu có) thêm xuống cuối
                map.forEach((it) => ordered.push(it));

                merged[pid] = ordered;
            });

            return merged;
        });

        setCartQuantities(qtyMap);
        setCartSummary({
            subtotal: data?.subtotal || 0,
            shippingFee: data?.shippingFee || 0,
            total: data?.total || data?.subtotal || 0,
        });
    };


    // Nếu user đã login thì load giỏ hàng để biết mỗi món đang có bao nhiêu + tổng tiền
    useEffect(() => {
        const fetchCart = async () => {
            if (!user) {
                setCartQuantities({});
                setCartItemsByProduct({});
                setCartSummary({ subtotal: 0, shippingFee: 0, total: 0 });
                return;
            }
            try {
                const data = await getCart(user.id, Number(id));
                buildCartStateFromResponse(data);
            } catch (err) {
                console.error(err);
                // lỗi thì coi như không có cart
                setCartQuantities({});
                setCartItemsByProduct({});
                setCartSummary({ subtotal: 0, shippingFee: 0, total: 0 });
            }
        };

        fetchCart();
    }, [user, id]);

    // helper: sync lại state giỏ từ response BE
    const syncQuantitiesFromResponse = (data) => {
        const status = data?.status || null;

        // Nếu backend trả về không còn CART (vd vừa chuyển sang PENDING/PAID)
        if (status && status !== 'CART') {
            setCartQuantities({});
            setCartItemsByProduct({});
            setCartSummary({ subtotal: 0, shippingFee: 0, total: 0 });
            return;
        }

        buildCartStateFromResponse(data);
    };

    // ====== LOGIC CHỌN OPTIONS (khi thêm) ======

    // Group product.details theo attribute
    const buildOptionGroups = (product) => {
        if (!product || !product.details || product.details.length === 0) return [];
        const map = {}; // attributeId -> { attribute, options: [] }

        product.details.forEach((d) => {
            if (!d || !d.attribute) return;
            const attrId = d.attribute.id;
            if (!map[attrId]) {
                map[attrId] = {
                    attribute: d.attribute,
                    options: [],
                };
            }
            map[attrId].options.push(d);
        });

        return Object.values(map);
    };

    const isMultiAttribute = (attribute) => {
        // Tạm thời: nếu name chứa "topping" (không phân biệt hoa thường) thì cho chọn nhiều
        if (!attribute?.name) return false;
        const name = attribute.name.toLowerCase();
        if (name.includes('topping')) return true;
        return false;
    };

    // Xác định attribute group nào là "bắt buộc"
    const isRequiredAttributeGroup = (group) => {
        if (!group || !group.attribute) return false;
        const attr = group.attribute;
        const name = (attr.name || '').toLowerCase();

        // Nếu backend đã set isRequired = false -> không bắt buộc
        if (attr.isRequired === false) {
            return false;
        }

        // Topping thường là optional
        if (name.includes('topping')) return false;

        // Mặc định: còn lại (Size, Đường, Đá, ...) là bắt buộc
        return true;
    };


    const openOptionModal = (product) => {
        if (!product) return;

        const groups = buildOptionGroups(product);
        const saved = loadProductOptions(product.id);

        const initialSelections = {};

        if (saved?.selections?.length) {
            // map từ saved -> tmpSelections
            saved.selections.forEach((sel) => {
                const { attributeId, detailId } = sel;

                // Tìm group ứng với attribute
                const group = groups.find((g) => g.attribute.id === attributeId);
                if (!group) return;

                // Nếu group này KHÔNG bắt buộc (isRequired = false, hoặc topping)
                // => không auto chọn lại từ localStorage
                if (!isRequiredAttributeGroup(group)) {
                    return;
                }

                const attr = group.attribute;
                const multi = isMultiAttribute(attr);

                if (!initialSelections[attributeId]) {
                    initialSelections[attributeId] = {
                        type: multi ? 'multi' : 'single',
                        values: [],
                    };
                }

                if (multi) {
                    initialSelections[attributeId].values.push(detailId);
                } else {
                    initialSelections[attributeId].values = [detailId];
                }
            });
        } else {
            // Nếu chưa có lưu gì: cho mặc định chọn option đầu tiên mỗi group
            groups.forEach((g) => {
                const attrId = g.attribute.id;
                const multi = isMultiAttribute(g.attribute);
                const required = isRequiredAttributeGroup(g);

                initialSelections[attrId] = {
                    type: multi ? 'multi' : 'single',
                    values: multi
                        ? []
                        : (required && g.options[0] ? [g.options[0].id] : []),
                };
            });
        }

        setOptionProduct(product);
        setTmpSelections(initialSelections);
        setOptionModalOpen(true);
    };

    const toggleOption = (attribute, detail) => {
        const attrId = attribute.id;
        const multi = isMultiAttribute(attribute);

        // Xác định attribute này có bắt buộc không (theo cùng logic isRequiredAttributeGroup)
        const isRequired = (() => {
            const name = (attribute.name || '').toLowerCase();

            if (attribute.isRequired === false) return false;
            if (attribute.isRequired === true) return true;

            // Topping mặc định không bắt buộc
            if (name.includes('topping')) return false;

            // Còn lại mặc định là bắt buộc
            return true;
        })();

        setTmpSelections((prev) => {
            const current = prev[attrId] || {
                type: multi ? 'multi' : 'single',
                values: [],
            };

            if (!multi) {
                // SINGLE CHOICE
                const alreadySelected = current.values.includes(detail.id);

                // Nếu KHÔNG BẮT BUỘC => cho phép click lần 2 để bỏ chọn
                if (!isRequired) {
                    return {
                        ...prev,
                        [attrId]: {
                            ...current,
                            type: 'single',
                            values: alreadySelected ? [] : [detail.id],
                        },
                    };
                }

                // Nếu BẮT BUỘC => luôn phải có 1 lựa chọn
                return {
                    ...prev,
                    [attrId]: {
                        ...current,
                        type: 'single',
                        values: [detail.id],
                    },
                };
            }

            // MULTI CHOICE (topping, ...): giữ logic bật / tắt như cũ
            const exists = current.values.includes(detail.id);
            const newValues = exists
                ? current.values.filter((id) => id !== detail.id)
                : [...current.values, detail.id];

            return {
                ...prev,
                [attrId]: {
                    ...current,
                    type: 'multi',
                    values: newValues,
                },
            };
        });
    };

    const confirmOptionsAndAdd = async () => {
        if (!optionProduct) return;

        const groups = buildOptionGroups(optionProduct);

        // Validate: mỗi group single phải có ít nhất 1 lựa chọn
        for (const g of groups) {
            if (!isRequiredAttributeGroup(g)) continue;

            const attrId = g.attribute.id;
            const current = tmpSelections[attrId];
            if (!current) continue;
            if (current.type === 'single' && current.values.length === 0) {
                message.warning(`Vui lòng chọn "${g.attribute.name}".`);
                return;
            }
        }

        // build selections để lưu
        const selections = [];
        groups.forEach((g) => {
            const attrId = g.attribute.id;
            const current = tmpSelections[attrId];
            if (!current || !current.values.length) return;

            current.values.forEach((detailId) => {
                const detail = g.options.find((d) => d.id === detailId);
                if (!detail) return;
                selections.push({
                    attributeId: attrId,
                    attributeName: g.attribute.name,
                    detailId: detail.id,
                    value: detail.value,
                    priceAdjustment: detail.priceAdjustment ?? 0,
                });
            });
        });

        // lưu vào localStorage cho CartPage & Checkout dùng (mặc định)
        saveProductOptions(optionProduct.id, selections);

        // Lấy danh sách id của ProductDetail để gửi lên backend
        const detailIds = selections.map((sel) => sel.detailId);

        // gọi API thêm vào giỏ như bình thường
        await handleAddToCart(optionProduct, {
            detailIds,
        });

        setOptionModalOpen(false);
        setOptionProduct(null);
    };

    const handleAddToCart = async (product, options = {}) => {
        const { detailIds } = options;

        // Nếu chưa đăng nhập
        if (!user) {
            setLoginModalOpen(true);
            return;
        }

        // Nếu có đăng nhập nhưng role không được phép order
        if (!canOrder) {
            message.warning('Tài khoản này không được phép đặt món.');
            return;
        }

        const currentQty = cartQuantities[product.id] || 0;
        if (currentQty >= MAX_PER_PRODUCT) {
            message.warning(`Bạn chỉ có thể đặt tối đa ${MAX_PER_PRODUCT} phần cho một món.`);
            return;
        }
        maybeWarnLargeOrder(product.id, currentQty + 1);

        try {
            setAddingProductId(product.id);
            const data = await addCartItem({
                accountId: user.id,
                restaurantId: Number(id),
                productId: product.id,
                quantity: 1,
                detailIds: detailIds || [],
            });

            syncQuantitiesFromResponse(data);
        } catch (err) {
            console.error(err);

            const status = err?.response?.status;
            const data = err?.response?.data;
            console.log('status:', status);
            console.log('data:', data);

            // BẤT KỲ 400 nào từ /api/cart/items ta đều coi là thiếu địa chỉ giao hàng
            if (status === 400) {
                setAddressModalOpen(true);
            } else {
                setErrorModalOpen(true);
            }
        } finally {
            setAddingProductId(null);
        }
    };

    // ====== TĂNG/GIẢM CHO MÓN KHÔNG OPTIONS (DÙNG itemId) ======
    const handleChangeQuantity = async (product, delta) => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (!canOrder) {
            message.warning('Tài khoản này không được phép đặt món.');
            return;
        }

        const current = cartQuantities[product.id] || 0;
        const newQty = current + delta;

        if (newQty < 0) return;

        if (newQty > MAX_PER_PRODUCT) {
            message.warning(`Bạn chỉ có thể đặt tối đa ${MAX_PER_PRODUCT} phần cho một món.`);
            return;
        }

        maybeWarnLargeOrder(product.id, newQty);

        try {
            setAddingProductId(product.id);

            // Lấy cartItem duy nhất của product này trong giỏ
            const productItems = cartItemsByProduct[product.id] || [];
            const onlyItem = productItems.length === 1 ? productItems[0] : null;

            // Nếu vì lý do nào đó chưa có item (state chưa sync kịp) -> fallback gọi lại addCartItem
            if (!onlyItem) {
                // Nếu newQty >= 1 mà FE chưa có item -> cứ add 1 lần
                if (newQty > 0) {
                    const data = await addCartItem({
                        accountId: user.id,
                        restaurantId: Number(id),
                        productId: product.id,
                        quantity: 1,
                        detailIds: [],
                    });
                    syncQuantitiesFromResponse(data);
                }
                return;
            }

            // Update theo itemId. Backend của bạn đã hỗ trợ newQuantity=0 => delete item.
            const data = await updateCartItemByItemId({
                accountId: user.id,
                itemId: onlyItem.itemId,
                quantity: newQty, // 0 => backend tự xoá
                restaurantId: Number(id), // gửi kèm cũng được, backend không cần nhưng không sao
            });

            syncQuantitiesFromResponse(data);
        } catch (err) {
            console.error(err);
            message.error('Không cập nhật được số lượng. Vui lòng thử lại.');
        } finally {
            setAddingProductId(null);
        }
    };

    // ====== MỞ MODAL CHỌN COMBO KHI TRỪ ======
    const openDecreaseModal = (product) => {
        setDecreaseProduct(product);
        setDecreaseModalOpen(true);
    };

    // ====== TĂNG 1 ĐƠN VỊ Ở ĐÚNG COMBO ======
    const handleIncreaseOneForItem = async (cartItem) => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (!canOrder) {
            message.warning('Tài khoản này không được phép đặt món.');
            return;
        }

        const pid = cartItem.productId;
        const currentTotal = cartQuantities[pid] || 0;

        if (currentTotal >= MAX_PER_PRODUCT) {
            message.warning(`Bạn chỉ có thể đặt tối đa ${MAX_PER_PRODUCT} phần cho một món.`);
            return;
        }

        maybeWarnLargeOrder(pid, currentTotal + 1);

        try {
            setAddingProductId(cartItem.productId);

            const data = await updateCartItemByItemId({
                accountId: user.id,
                itemId: cartItem.itemId,
                quantity: cartItem.quantity + 1,
                restaurantId: Number(id),
            });

            syncQuantitiesFromResponse(data);
        } catch (err) {
            console.error(err);
            message.error('Không cập nhật được số lượng.');
        } finally {
            setAddingProductId(null);
        }
    };

    // ====== CHỈNH SỐ LƯỢNG TRỰC TIẾP CHO COMBO ======
    const handleUpdateQuantityForItem = async (cartItem, quantity) => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (!canOrder) {
            message.warning('Tài khoản này không được phép đặt món.');
            return;
        }

        if (quantity > MAX_PER_PRODUCT) {
            message.warning(`Bạn chỉ có thể đặt tối đa ${MAX_PER_PRODUCT} phần cho một combo.`);
            return;
        }
        const pid = cartItem.productId;
        const currentTotal = cartQuantities[pid] || 0;
        const nextTotal = currentTotal - (cartItem.quantity || 0) + quantity;

        maybeWarnLargeOrder(pid, nextTotal);

        try {
            setAddingProductId(cartItem.productId);

            const data = await updateCartItemByItemId({
                accountId: user.id,
                itemId: cartItem.itemId,
                quantity,
                restaurantId: Number(id),
            });

            syncQuantitiesFromResponse(data);
        } catch (err) {
            console.error(err);
            message.error('Không cập nhật được số lượng.');
        } finally {
            setAddingProductId(null);
        }
    };

    // Trừ 1 đơn vị ở đúng combo (OrderItem) được chọn
    const handleDecreaseOneForItem = async (cartItem) => {
        if (!user) {
            navigate('/login');
            return;
        }

        // Nếu có đăng nhập nhưng role không được phép order
        if (!canOrder) {
            message.warning('Tài khoản này không được phép đặt món.');
            return;
        }

        const current = cartItem.quantity || 0;
        const newQty = current - 1;
        if (newQty < 0) return;

        try {
            setAddingProductId(cartItem.productId);

            const data = await updateCartItemByItemId({
                accountId: user.id,
                itemId: cartItem.itemId,
                quantity: newQty,
                restaurantId: Number(id),
            });

            syncQuantitiesFromResponse(data);

            // Nếu sau khi trừ xong mà product đó chỉ còn 1 combo hoặc 0 combo
            // thì đóng modal cho gọn
            const productItems = (data?.items || []).filter(
                (it) => it.productId === cartItem.productId
            );
            if (productItems.length === 0) {
                setDecreaseModalOpen(false);
                setDecreaseProduct(null);
            }
        } catch (err) {
            console.error(err);
            message.error('Không cập nhật được số lượng. Vui lòng thử lại.');
        } finally {
            setAddingProductId(null);
        }
    };

    const handleGoToCart = () => {
        if (!user) {
            navigate('/login');
            return;
        }

        // Nếu có đăng nhập nhưng role không được phép order
        if (!canOrder) {
            message.warning('Tài khoản này không được phép đặt món.');
            return;
        }

        if (totalCartItems === 0) return;

        // Chỉ điều hướng, KHÔNG đánh dấu để xoá cart nữa
        navigate('/cart', {
            state: { restaurantId: Number(id) },
        });
    };

    const handleBackToHome = async () => {
        try {
            if (user) {
                // Xoá GIỎ CỦA NHÀ HÀNG HIỆN TẠI khi bấm "Về trang chủ"
                await clearCartForRestaurant({
                    accountId: user.id,
                    restaurantId: Number(id),
                });
            }
        } catch (error) {
            console.error('Failed to clear cart when back home:', error);
        } finally {
            navigate('/');
        }
    };

    const handleImageError = (productId) => {
        setBrokenImages((prev) => ({ ...prev, [productId]: true }));
    };

    if (!restaurant) {
        return <div className="detail-loading">Đang tải dữ liệu quán ăn...</div>;
    }

    return (
        <>
            {contextHolder}
            <div className="detail-container">
                <div className="detail-wrapper">
                    {/* Cột trái: thông tin quán + menu */}
                    <div className="detail-main">
                        {/* Nút quay về Home */}
                        <div className="detail-back-row">
                            <button
                                type="button"
                                className="detail-back-btn"
                                onClick={handleBackToHome}
                            >
                                ← Về trang chủ
                            </button>
                        </div>
                        <div className="panel res-header-info">
                            <h1 className="res-name">{restaurant.name}</h1>
                            <p className="res-address">{restaurant.address}</p>
                        </div>

                        <div className="panel menu-panel">
                            <div className="menu-header">
                                <div>
                                    <h2 className="menu-title">Thực đơn hôm nay</h2>
                                    <p className="menu-subtitle">
                                        Chọn món bạn thích, chúng tôi sẽ giao thật nhanh.
                                    </p>
                                </div>
                                <span className="menu-count">{products.length} món</span>
                            </div>

                            {products.length === 0 && (
                                <div className="menu-empty">
                                    Quán hiện chưa có món nào. Vui lòng quay lại sau.
                                </div>
                            )}

                            <div className="menu-list">
                                {products.map((p) => {
                                    const qty = cartQuantities[p.id] || 0;
                                    const showImage = p.image && !brokenImages[p.id];

                                    const isSoldOut =
                                        p.isAvailable === false ||
                                        p.isAvailable === 0;

                                    return (
                                        <div
                                            key={p.id}
                                            className={`menu-item ${isSoldOut ? 'menu-item--soldout' : ''}`}
                                        >
                                            <div className="menu-item-main">
                                                {/* Ảnh món ăn + placeholder nếu không có / bị lỗi */}
                                                <div className="menu-item-thumb">
                                                    {showImage ? (
                                                        <img
                                                            src={p.image}
                                                            alt={p.name}
                                                            onError={() => handleImageError(p.id)}
                                                            className="menu-item-thumb-img"
                                                        />
                                                    ) : (
                                                        <div className="menu-item-thumb-placeholder">
                                                            <FiImage size={26} />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="menu-item-info">
                                                    <h4 className="menu-item-name">{p.name}</h4>
                                                    {p.description && (
                                                        <p className="menu-item-desc">{p.description}</p>
                                                    )}
                                                    <div className="menu-item-price">
                                                        {p.price?.toLocaleString('vi-VN')} đ
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="menu-item-actions">
                                                {isSoldOut ? (
                                                    <span className="menu-item-soldout-label">Hết món</span>
                                                ) : user && !canOrder ? (
                                                    // Đã đăng nhập nhưng role không được phép đặt món -> ẩn nút, chỉ hiện label
                                                    <span className="menu-item-soldout-label">Không thể đặt món</span>
                                                ) : qty === 0 ? (
                                                    <button
                                                        type="button"
                                                        className="btn-add-primary"
                                                        onClick={() => {
                                                            const hasOptions = p.details && p.details.length > 0;
                                                            if (hasOptions) openOptionModal(p);
                                                            else handleAddToCart(p);
                                                        }}
                                                        disabled={addingProductId === p.id}
                                                    >
                                                        {addingProductId === p.id ? 'Đang thêm...' : '+ Thêm'}
                                                    </button>
                                                ) : (
                                                    <div className="menu-qty-group">
                                                        <button
                                                            type="button"
                                                            className="menu-qty-btn"
                                                            onClick={() => {
                                                                const productItems = cartItemsByProduct[p.id] || [];
                                                                if (productItems.length === 0) return;

                                                                if (productItems.length === 1) {
                                                                    handleDecreaseOneForItem(productItems[0]);
                                                                } else {
                                                                    openDecreaseModal(p);
                                                                }
                                                            }}
                                                            disabled={addingProductId === p.id}
                                                        >
                                                            −
                                                        </button>

                                                        <span className="menu-qty-value">{qty}</span>

                                                        <button
                                                            type="button"
                                                            className="menu-qty-btn"
                                                            onClick={() => {
                                                                const productItems = cartItemsByProduct[p.id] || [];
                                                                const hasOptions = p.details && p.details.length > 0;

                                                                if (!hasOptions) {
                                                                    handleChangeQuantity(p, +1);
                                                                    return;
                                                                }

                                                                if (productItems.length === 0) {
                                                                    openOptionModal(p);
                                                                    return;
                                                                }

                                                                // Có ít nhất 1 combo → mở modal quản lý
                                                                openDecreaseModal(p);
                                                            }}
                                                            disabled={addingProductId === p.id}
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Cột phải: mini-cart */}
                    <aside className="detail-cart">
                        <div className="panel detail-cart-panel">
                            <div className="detail-cart-body">
                                <div className="detail-cart-top">
                                    <div className="detail-cart-icon-wrapper">
                                        <span className="detail-cart-icon">
                                            <FiShoppingBag size={22} />
                                        </span>
                                        {totalCartItems > 0 && (
                                            <span className="detail-cart-badge">
                                                {totalCartItems}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="detail-cart-prices">
                                    <div className="detail-cart-row detail-cart-row-total">
                                        <span>Tổng cộng</span>
                                        {/* CHỈ HIỂN THỊ SUBTOTAL, KHÔNG CỘNG PHÍ SHIP Ở MÀN NÀY */}
                                        <span className="detail-cart-total">
                                            {formatPrice(cartSummary.subtotal)}
                                        </span>
                                    </div>
                                </div>

                                {!user ? (
                                    <p className="detail-cart-note">Vui lòng đăng nhập để đặt món.</p>
                                ) : !canOrder ? (
                                    <p className="detail-cart-note">Tài khoản này không được phép đặt món.</p>
                                ) : null}

                            </div>

                            <button
                                type="button"
                                className="detail-cart-button"
                                onClick={handleGoToCart}
                                disabled={!canOrder || totalCartItems === 0}
                            >
                                Giao hàng
                            </button>
                        </div>
                    </aside>
                </div>
            </div>

            {/* ==== CÁC MODAL ==== */}
            <LoginModal
                open={loginModalOpen}
                onClose={() => setLoginModalOpen(false)}
                onLogin={() => {
                    setLoginModalOpen(false);
                    navigate('/login');
                }}
            />

            <AddressModal
                open={addressModalOpen}
                onClose={() => setAddressModalOpen(false)}
                onGoProfile={() => {
                    setAddressModalOpen(false);
                    navigate('/profile', {
                        state: { returnTo: { path: location.pathname, state: location.state } }
                    });
                }}
            />

            <ErrorModal
                open={errorModalOpen}
                onClose={() => setErrorModalOpen(false)}
            />

            <OptionModal
                open={optionModalOpen}
                product={optionProduct}
                tmpSelections={tmpSelections}
                buildOptionGroups={buildOptionGroups}
                isMultiAttribute={isMultiAttribute}
                toggleOption={toggleOption}
                formatPrice={formatPrice}
                onOk={confirmOptionsAndAdd}
                onCancel={() => {
                    setOptionModalOpen(false);
                    setOptionProduct(null);
                }}
            />

            <DecreaseComboModal
                open={decreaseModalOpen}
                product={decreaseProduct}
                cartItemsByProduct={cartItemsByProduct}
                formatPrice={formatPrice}
                addingProductId={addingProductId}

                onIncreaseOne={handleIncreaseOneForItem}
                onDecreaseOne={handleDecreaseOneForItem}
                onUpdateQuantity={handleUpdateQuantityForItem}
                onAddNewOption={() => {
                    setDecreaseModalOpen(false);
                    setDecreaseProduct(null);
                    openOptionModal(decreaseProduct);
                }}
                onClose={() => {
                    setDecreaseModalOpen(false);
                    setDecreaseProduct(null);
                }}
            />

        </>
    );
};

export default RestaurantDetail;