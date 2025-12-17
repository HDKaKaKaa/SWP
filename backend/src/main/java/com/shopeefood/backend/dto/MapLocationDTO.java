package com.shopeefood.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MapLocationDTO {
    private Integer id;          // ID của quán hoặc shipper
    private String name;         // Tên quán hoặc tên shipper
    private String type;         // "RESTAURANT" hoặc "SHIPPER"
    private Double latitude;
    private Double longitude;
    private String status;       // ACTIVE, ONLINE, BUSY...
    private String info;         // Địa chỉ (nếu là quán) hoặc Biển số xe (nếu là shipper)
    private String image;        // Ảnh đại diện (để hiện trong popup)
    private String phone;        // SĐT liên hệ
}