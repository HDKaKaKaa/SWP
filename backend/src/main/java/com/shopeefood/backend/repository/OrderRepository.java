package com.shopeefood.backend.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.shopeefood.backend.entity.Order;

@Repository
public interface OrderRepository extends JpaRepository<Order, Integer>, JpaSpecificationExecutor<Order> {
        // Hàm tìm đơn hàng của một khách hàng (Để sau này làm trang Lịch sử đơn hàng)
        List<Order> findByCustomerId(Integer customerId);

        // Lấy lịch sử đơn hàng của khách (loại CART và CART_DELETED)
        List<Order> findByCustomerIdAndStatusNotIn(Integer customerId, List<String> statuses);

        /**
         * 1. Tính TỔNG DOANH THU toàn hệ thống.
         * Chỉ tính những đơn đã hoàn thành (COMPLETED).
         */
        @Query("SELECT SUM(o.totalAmount) FROM Order o WHERE o.status = 'COMPLETED'")
        BigDecimal sumTotalRevenue();

        /**
         * 2. Đếm SỐ ĐƠN HÀNG trong một khoảng thời gian.
         * Dùng để đếm đơn hôm nay (truyền vào StartOfToday và EndOfToday).
         */
        @Query("SELECT COUNT(o) FROM Order o WHERE o.createdAt BETWEEN :start AND :end")
        Long countOrdersByDateRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

        /**
         * 3. Lấy dữ liệu biểu đồ doanh thu 7 ngày gần nhất.
         * Sử dụng NATIVE QUERY để dùng hàm DATE() và GROUP BY của MySQL dễ dàng hơn.
         * Trả về List<Object[]> gồm: [0] là Ngày (Date), [1] là Tổng tiền (Decimal).
         */
        @Query(value = "SELECT CAST(created_at AS DATE) as label, SUM(total_amount) as value " +
                        "FROM orders " +
                        "WHERE status = 'COMPLETED' AND created_at >= :startDate " +
                        "GROUP BY CAST(created_at AS DATE) " +
                        "ORDER BY CAST(created_at AS DATE) ASC", nativeQuery = true)
        List<Object[]> getRevenueLast7DaysRaw(@Param("startDate") LocalDateTime startDate);

        // Tham số startDate và endDate là LocalDateTime
        @Query("SELECT o FROM Order o WHERE " +
                        "(:status IS NULL OR o.status = :status) AND " +
                        "(:startDate IS NULL OR o.createdAt >= :startDate) AND " +
                        "(:endDate IS NULL OR o.createdAt <= :endDate) " +
                        "ORDER BY o.createdAt DESC")
        List<Order> findOrders(
                        @Param("status") String status,
                        @Param("startDate") LocalDateTime startDate,
                        @Param("endDate") LocalDateTime endDate);

        // Tìm đơn hàng trạng thái "CART" (giỏ hàng) của 1 khách
        Optional<Order> findFirstByCustomerIdAndStatus(Integer customerId, String status);

        // Tìm đơn hàng "CART" theo khách + nhà hàng (nếu sau này cần)
        Optional<Order> findFirstByCustomerIdAndRestaurantIdAndStatus(
                        Integer customerId,
                        Integer restaurantId,
                        String status);

        // Dùng khi muốn load tất cả giỏ CART của 1 khách
        List<Order> findByCustomerIdAndStatus(Integer customerId, String status);

        // Lấy tất cả đơn hàng của nhà hàng
        List<Order> findByRestaurantId(Integer restaurantId);

        // Lấy đơn hàng theo trạng thái (filter)
        List<Order> findByRestaurantIdAndStatus(Integer restaurantId, String status);

        // Tìm đơn theo mã đơn/ngày tạo đơn, trạng thái, nhà hàng,...
        @Query("SELECT o FROM Order o " +
                        "LEFT JOIN o.customer c " +
                        "LEFT JOIN c.customerProfile cp " +
                        "WHERE o.restaurant.owner.id = :ownerId " +
                        "AND (:restaurantId IS NULL OR o.restaurant.id = :restaurantId) " +
                        "AND (o.status IN :statusList) " +
                        "AND (:searchPattern IS NULL OR " +
                        "     LOWER(o.orderNumber) LIKE :searchPattern OR " +
                        "     LOWER(cp.fullName) LIKE :searchPattern OR " +
                        "     LOWER(o.note) LIKE :searchPattern) " +
                        "AND (CAST(:from AS timestamp) IS NULL OR o.createdAt >= :from) " +
                        "AND (CAST(:to AS timestamp) IS NULL OR o.createdAt <= :to)")
        Page<Order> findOrderIdsByOwnerAndRestaurant(
                        @Param("ownerId") Integer ownerId,
                        @Param("restaurantId") Integer restaurantId,
                        @Param("searchPattern") String searchPattern,
                        @Param("from") LocalDateTime from,
                        @Param("to") LocalDateTime to,
                        @Param("statusList") List<String> statusList,
                        Pageable pageable);

        // Tìm OrderDetail bằng Id
        @Query("SELECT DISTINCT o FROM Order o " +
                        "LEFT JOIN FETCH o.orderItems oi " +
                        "LEFT JOIN FETCH o.customer c " +
                        "LEFT JOIN FETCH c.customerProfile cp " + // FETCH thêm Profile của Customer
                        "LEFT JOIN FETCH o.restaurant r " +
                        "WHERE o.id IN :orderIds")
        List<Order> findOrdersWithDetailsByIds(@Param("orderIds") List<Integer> orderIds);

        @Query("SELECT COUNT(o) FROM Order o WHERE o.restaurant.id = :restaurantId " +
                        "AND o.status NOT IN ('COMPLETED', 'CANCELLED', 'REJECTED', 'CART', 'CART_DELETED')")
        long countActiveOrdersByRestaurant(Integer restaurantId);

        // Lấy đơn hàng của khách hàng kèm orderItems và các quan hệ
        @Query("SELECT DISTINCT o FROM Order o " +
                        "LEFT JOIN FETCH o.orderItems oi " +
                        "LEFT JOIN FETCH oi.product " +
                        "LEFT JOIN FETCH o.restaurant " +
                        "LEFT JOIN FETCH o.shipper " +
                        "WHERE o.customer.id = :customerId " +
                        "AND (:startDate IS NULL OR o.createdAt >= :startDate) " +
                        "AND (:endDate IS NULL OR o.createdAt <= :endDate) " +
                        "ORDER BY o.createdAt DESC")
        List<Order> findByCustomerIdWithDetails(@Param("customerId") Integer customerId);

        /**
         * Tìm đơn hàng có sẵn cho shipper
         * Chỉ lấy đơn đã được Owner duyệt (status = PREPARING) và chưa có shipper
         * Flow: Customer đặt (PENDING) → Owner duyệt (PREPARING) → Shipper nhận
         * (SHIPPING)
         * Tối ưu với JOIN FETCH để tránh N+1 problem
         */
        @Query("SELECT DISTINCT o FROM Order o " +
                        "LEFT JOIN FETCH o.restaurant r " +
                        "LEFT JOIN FETCH o.customer c " +
                        "WHERE o.status = 'PREPARING' AND o.shipper IS NULL " +
                        "ORDER BY o.createdAt DESC")
        List<Order> findAvailableOrders();

        /**
         * Tìm đơn hàng của shipper - Tối ưu với JOIN FETCH để tránh N+1 problem
         */
        @Query("SELECT DISTINCT o FROM Order o " +
                        "LEFT JOIN FETCH o.restaurant r " +
                        "LEFT JOIN FETCH o.customer c " +
                        "WHERE o.shipper.accountId = :shipperId " +
                        "ORDER BY o.createdAt DESC")
        List<Order> findOrdersByShipperId(@Param("shipperId") Integer shipperId);

        // Gọi sau khi cập nhập status
        @Query("SELECT o FROM Order o " +
                        "LEFT JOIN FETCH o.orderItems oi " +
                        "LEFT JOIN FETCH oi.product " +
                        "LEFT JOIN FETCH o.customer " +
                        "LEFT JOIN FETCH o.restaurant " +
                        "WHERE o.id = :orderId")
        Optional<Order> findByIdWithDetails(@Param("orderId") Integer orderId);

        /**
         * Query lấy doanh thu theo bộ lọc động (Native Query)
         * COALESCE(?3, NULL) dùng để xử lý logic: Nếu tham số restaurantId là NULL thì
         * bỏ qua điều kiện đó.
         */
        @Query(value = "SELECT CAST(o.created_at AS DATE) as label, SUM(o.total_amount) as value " +
                        "FROM orders o " +
                        "WHERE o.status = 'COMPLETED' " +
                        "AND o.created_at >= :startDate AND o.created_at <= :endDate " +
                        "AND (:restaurantId IS NULL OR o.restaurant_id = :restaurantId) " +
                        "GROUP BY CAST(o.created_at AS DATE) " +
                        "ORDER BY CAST(o.created_at AS DATE) ASC", nativeQuery = true)
        List<Object[]> getRevenueByFilter(
                        @Param("startDate") LocalDateTime startDate,
                        @Param("endDate") LocalDateTime endDate,
                        @Param("restaurantId") Integer restaurantId);

    @Query("SELECT DISTINCT o FROM Order o " +
            "LEFT JOIN FETCH o.customer acc " +          // acc là Account
            "LEFT JOIN Customer cust ON cust.accountId = acc.id " + // Join bảng Customer để lấy FullName
            "LEFT JOIN FETCH o.restaurant r " +
            "LEFT JOIN FETCH o.shipper s " +
            "LEFT JOIN FETCH s.account " +
            "LEFT JOIN FETCH o.orderItems oi " +
            "WHERE o.status IN :statuses " +
            "AND (CAST(:startDate AS timestamp) IS NULL OR o.createdAt >= :startDate) " +
            "AND (CAST(:endDate AS timestamp) IS NULL OR o.createdAt <= :endDate) " +
            "AND (:searchKey IS NULL OR (" +
            "   LOWER(o.orderNumber) LIKE :searchKey OR " +      // Tìm theo Mã đơn
            "   LOWER(cust.fullName) LIKE :searchKey OR " +      // Tìm theo Tên khách
            "   LOWER(acc.phone) LIKE :searchKey OR " +          // Tìm theo SĐT khách
            "   LOWER(r.name) LIKE :searchKey OR " +             // Tìm theo Tên quán
            "   LOWER(r.phone) LIKE :searchKey " +               // Tìm theo SĐT quán
            ")) " +
            "ORDER BY o.createdAt DESC")
    List<Order> findOrdersWithDetails(
            @Param("searchKey") String searchKey, // <--- THÊM THAM SỐ NÀY
            @Param("statuses") List<String> statuses,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

        @Query("SELECT o FROM Order o WHERE o.customer.id = :customerId " +
                        "AND o.status = 'COMPLETED' " +
                        "AND o.createdAt BETWEEN :startDate AND :endDate")
        List<Order> findOrdersByCustomerAndDateRange(
                        @Param("customerId") Integer customerId,
                        @Param("startDate") LocalDateTime startDate,
                        @Param("endDate") LocalDateTime endDate);

        long countByShipperAccountIdAndStatus(Integer shipperId, String status);
}
