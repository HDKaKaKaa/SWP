package com.shopeefood.backend.service;

import com.shopeefood.backend.dto.OrderDTO;
import com.shopeefood.backend.entity.Account;
import com.shopeefood.backend.entity.Customer;
import com.shopeefood.backend.entity.Order;
import com.shopeefood.backend.repository.CustomerRepository; // Import mới
import com.shopeefood.backend.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
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

    // Hàm lấy danh sách đơn hàng (Có lọc và điền thông tin khách hàng)
    @Transactional(readOnly = true) // Quan trọng để fetch lazy data
    public List<OrderDTO> getOrders(String status, LocalDate startDate, LocalDate endDate) {
        String filterStatus = (status == null || status.equals("ALL")) ? null : status;
        LocalDateTime startDateTime = (startDate != null) ? startDate.atStartOfDay() : null;
        LocalDateTime endDateTime = (endDate != null) ? endDate.atTime(LocalTime.MAX) : null;

        // 1. Lấy danh sách Entity Order từ DB
        List<Order> orders = orderRepository.findOrders(filterStatus, startDateTime, endDateTime);

        // 2. Tạo danh sách DTO để chứa kết quả
        List<OrderDTO> orderDTOs = new ArrayList<>();

        // 3. Duyệt qua từng Order và xử lý thủ công
        for (Order order : orders) {
            // Tạo DTO từ các thông tin cơ bản có sẵn trong Order entity
            OrderDTO dto = new OrderDTO(order);

            // --- XỬ LÝ LẤY TÊN KHÁCH HÀNG (THỦ CÔNG) ---
            // order.getCustomer() trả về Account entity
            Account customerAccount = order.getCustomer();
            if (customerAccount != null) {
                // Lấy ID của account
                Integer accountId = customerAccount.getId();

                // QUERY PHỤ: Tìm thông tin trong bảng customers dựa trên accountId
                Optional<Customer> customerOpt = customerRepository.findById(accountId);

                if (customerOpt.isPresent()) {
                    // Nếu tìm thấy, lấy fullName và gán vào DTO
                    dto.setCustomerName(customerOpt.get().getFullName());
                } else {
                    // Trường hợp hy hữu: Có account ID nhưng chưa có record trong bảng customers
                    dto.setCustomerName("Khách hàng (Chưa cập nhật tên)");
                }
            } else {
                // Trường hợp hy hữu: Đơn hàng không có customer_id
                dto.setCustomerName("Khách vãng lai");
            }
            // -------------------------------------------

            // Thêm DTO đã hoàn thiện vào danh sách
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