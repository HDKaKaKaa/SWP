package com.shopeefood.backend.dto;

import com.shopeefood.backend.entity.Restaurant;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.format.DateTimeFormatter;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RestaurantDTO {
    private Integer id;
    private String name;
    private String description;
    private String address;
    private String phone;
    private String image; // Front-end dùng biến này để hiển thị ảnh
    private String status;
    private String ownerName; // Hiển thị tên chủ quán
    private String ownerIdCard;
    private Double latitude;
    private Double longitude;
    private String createdAt;

    public RestaurantDTO(Restaurant restaurant) {
        if (restaurant != null) {
            this.id = restaurant.getId();
            this.name = restaurant.getName();
            this.description = restaurant.getDescription();
            this.address = restaurant.getAddress();
            this.phone = restaurant.getPhone();
            this.image = restaurant.getCoverImage();
            this.latitude = restaurant.getLatitude();
            this.longitude = restaurant.getLongitude();

            // Lấy tên enum
            if (restaurant.getStatus() != null) {
                this.status = restaurant.getStatus().name();
            }

            // Lấy tên chủ quán (tránh lỗi null)
            if (restaurant.getOwner() != null) {
                // Giả sử Owner có field fullName hoặc username
                // Bạn thay getUsername() bằng field thực tế bên Owner
                this.ownerName = restaurant.getOwner().getFullName();
                this.ownerIdCard = restaurant.getOwner().getIdCardNumber();
            }

            // Format ngày tạo cho đẹp
            if (restaurant.getCreatedAt() != null) {
                this.createdAt = restaurant.getCreatedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
            }
        }
    }
}