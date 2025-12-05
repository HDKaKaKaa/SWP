package com.shopeefood.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PaymentLinkDTO {
    private String bin;
    private String accountNumber;
    private String accountName;
    private Long amount;
    private String description;
    private Long orderCode;
    private String qrCode;
    private String checkoutUrl;
}
