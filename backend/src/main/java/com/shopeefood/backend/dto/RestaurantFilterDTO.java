package com.shopeefood.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RestaurantFilterDTO {
    private Integer id; 
    private String name;
}