package com.shopeefood.backend.service;

import com.shopeefood.backend.dto.ShipperHistoryItemDTO;
import com.shopeefood.backend.dto.ShipperOrderHistoryDTO;
import com.shopeefood.backend.dto.ShipperPerformanceDTO;
import com.shopeefood.backend.entity.Account;
import com.shopeefood.backend.entity.Customer;
import com.shopeefood.backend.entity.Feedback;
import com.shopeefood.backend.entity.Order;
import com.shopeefood.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AdminShipperService {

    @Autowired
    private ShipperRepository shipperRepository;
    @Autowired
    private AccountRepository accountRepository;
    @Autowired
    private FeedbackRepository feedbackRepository;
    @Autowired
    private CustomerRepository customerRepository;
    @Autowired
    private OrderRepository orderRepository; // <--- INJECT THÊM ORDER REPO

    // 1. Lấy danh sách thống kê (CẬP NHẬT: Nhận tham số Filter)
    public List<ShipperPerformanceDTO> getShipperList(String keyword, Boolean status, LocalDate startDate, LocalDate endDate) {
        String searchKey = (keyword != null && !keyword.trim().isEmpty()) ? keyword.trim().toLowerCase() : null;

        LocalDateTime start = (startDate != null) ? startDate.atStartOfDay() : null;
        LocalDateTime end = (endDate != null) ? endDate.atTime(LocalTime.MAX) : null;

        return shipperRepository.getShipperPerformance(searchKey, status, start, end);
    }

    // 2. Khóa / Mở khóa tài khoản Shipper (CẬP NHẬT: Thêm logic chặn khóa)
    @Transactional
    public void toggleShipperStatus(Integer accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản shipper"));

        // LOGIC MỚI: Nếu đang Active (tức là hành động sắp tới là Khóa) -> Kiểm tra đơn đang giao
        if (Boolean.TRUE.equals(account.getIsActive())) {
            long deliveringOrders = orderRepository.countByShipperAccountIdAndStatus(accountId, "SHIPPING");

            if (deliveringOrders > 0) {
                throw new RuntimeException("Không thể khóa! Tài xế đang giao " + deliveringOrders + " đơn hàng.");
            }
        }

        // Đảo ngược trạng thái: True -> False, False -> True
        account.setIsActive(!account.getIsActive());

        accountRepository.save(account);
    }

    @Transactional(readOnly = true)
    public List<ShipperOrderHistoryDTO> getShipperHistory(Integer shipperId, LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = (startDate != null) ? startDate.atStartOfDay() : null;
        LocalDateTime end = (endDate != null) ? endDate.atTime(LocalTime.MAX) : null;

        // 1. Lấy danh sách Order Entities (đã kèm items)
        List<Order> orders = shipperRepository.findShipperHistoryOrders(shipperId, start, end);

        if (orders.isEmpty()) return new ArrayList<>();

        // 2. Batch Fetch Feedback (Chỉ lấy feedback của những đơn này)
        List<Integer> orderIds = orders.stream().map(Order::getId).collect(Collectors.toList());
        Map<Integer, Feedback> feedbackMap = feedbackRepository.findByOrderIdIn(orderIds)
                .stream()
                .collect(Collectors.toMap(f -> f.getOrder().getId(), f -> f));

        // 3. Batch Fetch Customer Names (Để hiển thị tên thật thay vì username)
        List<Integer> customerAccIds = orders.stream()
                .map(o -> o.getCustomer().getId())
                .distinct()
                .collect(Collectors.toList());
        Map<Integer, String> customerNameMap = customerRepository.findAllById(customerAccIds)
                .stream()
                .collect(Collectors.toMap(Customer::getAccountId, Customer::getFullName));

        // 4. Map to DTO
        return orders.stream().map(order -> {
            ShipperOrderHistoryDTO dto = new ShipperOrderHistoryDTO();
            dto.setOrderId(order.getId());
            dto.setOrderNumber(order.getOrderNumber());
            dto.setShippedAt(order.getShippedAt());
            dto.setCompletedAt(order.getCompletedAt());
            dto.setShippingFee(order.getShippingFee());
            dto.setTotalAmount(order.getTotalAmount());

            // Map Restaurant
            if (order.getRestaurant() != null) {
                dto.setRestaurantName(order.getRestaurant().getName());
                dto.setRestaurantAddress(order.getRestaurant().getAddress());
            }

            // Map Customer
            if (order.getCustomer() != null) {
                String realName = customerNameMap.get(order.getCustomer().getId());
                dto.setCustomerName(realName != null ? realName : order.getCustomer().getUsername());
                dto.setCustomerPhone(order.getCustomer().getPhone());
            }

            // Map Feedback (CHỈ LẤY CỦA SHIPPER)
            Feedback fb = feedbackMap.get(order.getId());
            if (fb != null) {
                dto.setShipperRating(fb.getShipperRating());   // Lấy đúng trường shipperRating
                dto.setShipperComment(fb.getShipperComment()); // Lấy đúng trường shipperComment
            }

            // Map Items (Chi tiết sản phẩm)
            if (order.getOrderItems() != null) {
                List<ShipperHistoryItemDTO> itemDTOs = order.getOrderItems().stream().map(oi -> {
                    ShipperHistoryItemDTO itemDto = new ShipperHistoryItemDTO();
                    itemDto.setProductName(oi.getProduct().getName());
                    itemDto.setQuantity(oi.getQuantity());
                    itemDto.setPrice(oi.getPrice());
                    // Giả sử bạn lưu options/attributes dưới dạng JSON hoặc String trong OrderItem
                    // Nếu bạn có bảng riêng cho attributes, hãy map tương tự
                    // Ở đây tôi giả định OrderItem có phương thức getOptions() hoặc tương đương
                    // itemDto.setOptions(oi.getOptions());
                    return itemDto;
                }).collect(Collectors.toList());
                dto.setItems(itemDTOs);
            }

            return dto;
        }).collect(Collectors.toList());
    }
}