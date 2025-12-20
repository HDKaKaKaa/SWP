package com.shopeefood.backend.service;

import com.shopeefood.backend.dto.OrderDTO;
import com.shopeefood.backend.dto.OrderItemDTO;
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
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AdminOrderService {

    @Autowired
    private OrderRepository orderRepository;

    // --- BỔ SUNG REPO NÀY ĐỂ LẤY TÊN KHÁCH ---
    @Autowired
    private CustomerRepository customerRepository;
    @Autowired
    private FeedbackRepository feedbackRepository;

    private static final List<String> VIEWABLE_STATUSES = Arrays.asList(
            "PENDING", "PREPARING", "SHIPPING", "COMPLETED", "CANCELLED", "REFUNDED"
    );

    // Hàm lấy danh sách đơn hàng (Sửa lại dùng Specification)
    @Transactional(readOnly = true)
    public List<OrderDTO> getOrders(String status, LocalDate startDate, LocalDate endDate) {

        // 1. Xử lý ngày tháng
        LocalDateTime startDateTime = (startDate != null) ? startDate.atStartOfDay() : null;
        LocalDateTime endDateTime = (endDate != null) ? endDate.atTime(LocalTime.MAX) : null;

        // 2. Xử lý logic trạng thái
        List<String> targetStatuses;
        if (status == null || "ALL".equalsIgnoreCase(status)) {
            // Nếu là ALL, chỉ lấy danh sách cho phép (loại bỏ CART, REJECTED...)
            targetStatuses = VIEWABLE_STATUSES;
        } else {
            // Nếu chọn cụ thể, chỉ lấy trạng thái đó
            targetStatuses = Collections.singletonList(status);
        }

        // 3. Gọi Query với danh sách trạng thái
        List<Order> orders = orderRepository.findOrdersWithDetails(targetStatuses, startDateTime, endDateTime);

        // --- Các phần xử lý Feedback, Customer Name, Map DTO giữ nguyên như cũ ---

        // (Giữ nguyên code phần lấy Feedback và Customer Name map...)
        List<Integer> completedOrderIds = orders.stream()
                .filter(o -> "COMPLETED".equals(o.getStatus()))
                .map(Order::getId)
                .collect(Collectors.toList());

        Map<Integer, Feedback> feedbackMap;
        if (!completedOrderIds.isEmpty()) {
            feedbackMap = feedbackRepository.findByOrderIdIn(completedOrderIds)
                    .stream()
                    .collect(Collectors.toMap(f -> f.getOrder().getId(), f -> f));
        } else {
            feedbackMap = new HashMap<>();
        }

        List<Integer> customerAccountIds = orders.stream()
                .map(o -> o.getCustomer() != null ? o.getCustomer().getId() : null)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());

        Map<Integer, String> customerNameMap;
        if (!customerAccountIds.isEmpty()) {
            customerNameMap = customerRepository.findAllById(customerAccountIds)
                    .stream()
                    .collect(Collectors.toMap(Customer::getAccountId, Customer::getFullName));
        } else {
            customerNameMap = new HashMap<>();
        }

        List<OrderDTO> orderDTOs = new ArrayList<>();
        for (Order order : orders) {
            OrderDTO dto = new OrderDTO(order);

            // A. Map Customer Info
            Account customerAccount = order.getCustomer();
            if (customerAccount != null) {
                // SỬA: Lấy SĐT trực tiếp từ Account (vì customerAccount chính là Account)
                dto.setCustomerPhone(customerAccount.getPhone());

                // Lấy tên thật từ Map
                String realName = customerNameMap.get(customerAccount.getId());
                if (realName != null) {
                    dto.setCustomerName(realName);
                } else {
                    dto.setCustomerName(customerAccount.getUsername());
                }
            } else {
                dto.setCustomerName("Khách vãng lai");
            }

            // B. Map Shipper
            if (order.getShipper() != null) {
                dto.setShipperName(order.getShipper().getFullName());
                if (order.getShipper().getAccount() != null) {
                    dto.setShipperPhone(order.getShipper().getAccount().getPhone());
                    dto.setShipperEmail(order.getShipper().getAccount().getEmail());
                }
            }

            // C. Map Items
            if (order.getOrderItems() != null) {
                dto.setItems(order.getOrderItems().stream()
                        .map(OrderItemDTO::new)
                        .collect(Collectors.toList()));
            }

            // D. Map Feedback
            if ("COMPLETED".equals(order.getStatus()) && feedbackMap.containsKey(order.getId())) {
                Feedback fb = feedbackMap.get(order.getId());
                dto.setRating(fb.getRating());
                dto.setComment(fb.getComment());
                dto.setShipperRating(fb.getShipperRating());
                dto.setShipperComment(fb.getShipperComment());
            }

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