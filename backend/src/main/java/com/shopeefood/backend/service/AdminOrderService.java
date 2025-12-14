package com.shopeefood.backend.service;

import com.shopeefood.backend.dto.OrderDTO;
import com.shopeefood.backend.entity.Account;
import com.shopeefood.backend.entity.Customer;
import com.shopeefood.backend.entity.Feedback;
import com.shopeefood.backend.entity.Order;
import com.shopeefood.backend.repository.CustomerRepository; // Import mới
import com.shopeefood.backend.repository.FeedbackRepository;
import com.shopeefood.backend.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class AdminOrderService {

    @Autowired
    private OrderRepository orderRepository;

    // --- BỔ SUNG REPO NÀY ĐỂ LẤY TÊN KHÁCH ---
    @Autowired
    private CustomerRepository customerRepository;
    @Autowired
    private FeedbackRepository feedbackRepository;

    // Hàm lấy danh sách đơn hàng (Sửa lại dùng Specification)
    @Transactional(readOnly = true)
    public List<OrderDTO> getOrders(String status, LocalDate startDate, LocalDate endDate) {

        // 1. Tạo Specification (Query động)
        Specification<Order> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Điều kiện Status
            if (status != null && !status.isEmpty() && !"ALL".equals(status)) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            // Điều kiện Ngày bắt đầu
            if (startDate != null) {
                LocalDateTime startDateTime = startDate.atStartOfDay();
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startDateTime));
            }

            // Điều kiện Ngày kết thúc
            if (endDate != null) {
                LocalDateTime endDateTime = endDate.atTime(LocalTime.MAX);
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), endDateTime));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        // 2. Gọi Repository với Specification + Sắp xếp giảm dần
        List<Order> orders = orderRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"));

        // 3. Convert sang DTO và map tên khách hàng (Giữ nguyên logic cũ của bạn)
        List<OrderDTO> orderDTOs = new ArrayList<>();

        for (Order order : orders) {
            OrderDTO dto = new OrderDTO(order);

            // === BỔ SUNG: LẤY FEEDBACK NẾU CÓ ===
            if ("COMPLETED".equals(order.getStatus())) {
                Optional<Feedback> feedbackOpt = feedbackRepository.findByOrderId(order.getId());
                if (feedbackOpt.isPresent()) {
                    Feedback fb = feedbackOpt.get();
                    dto.setRating(fb.getRating());
                    dto.setComment(fb.getComment());
                    dto.setShipperRating(fb.getShipperRating());
                    dto.setShipperComment(fb.getShipperComment());
                }
            }
            // ====================================

            // --- XỬ LÝ LẤY TÊN KHÁCH HÀNG ---
            Account customerAccount = order.getCustomer();
            if (customerAccount != null) {
                Integer accountId = customerAccount.getId();
                Optional<Customer> customerOpt = customerRepository.findById(accountId);

                if (customerOpt.isPresent()) {
                    dto.setCustomerName(customerOpt.get().getFullName());
                } else {
                    dto.setCustomerName("Khách hàng (Chưa cập nhật tên)");
                }
            } else {
                dto.setCustomerName("Khách vãng lai");
            }
            // --------------------------------

            orderDTOs.add(dto);
        }

        return orderDTOs;
    }

    // Hàm cập nhật trạng thái đơn hàng (Giữ nguyên logic cũ của bạn)
    @Transactional
    public OrderDTO updateOrderStatus(Integer orderId, String newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng: " + orderId));

        String oldStatus = order.getStatus();
        LocalDateTime now = LocalDateTime.now();

        // --- LOGIC GHI NHẬN THỜI GIAN ---
        // Mốc 2: Quán nhận đơn
        if ("PREPARING".equals(newStatus) && "PENDING".equals(oldStatus)) {
            order.setRestaurantAcceptedAt(now);
        }
        // Mốc 3: Bắt đầu giao (Shipper nhận chuyến)
        if ("SHIPPING".equals(newStatus) && !"SHIPPING".equals(oldStatus)) {
            order.setShippedAt(now);
        }
        // Mốc 4: Hoàn thành hoặc Hủy
        if (("COMPLETED".equals(newStatus) || "CANCELLED".equals(newStatus))
                && !newStatus.equals(oldStatus)) {
            order.setCompletedAt(now);
        }
        // -----------------------------------------

        order.setStatus(newStatus);
        Order savedOrder = orderRepository.save(order);

        // Khi trả về DTO sau update, cũng cần điền tên khách hàng
        OrderDTO dto = new OrderDTO(savedOrder);
        if (savedOrder.getCustomer() != null) {
            Optional<Customer> customerOpt = customerRepository.findById(savedOrder.getCustomer().getId());
            customerOpt.ifPresent(customer -> dto.setCustomerName(customer.getFullName()));
        }
        return dto;
    }
}