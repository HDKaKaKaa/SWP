package com.shopeefood.backend.dto;


import lombok.Data;

@Data
public class ChangePasswordRequest {

    private Integer accountId;
    private String oldPassword;
    private String newPassword;
    private String confirmPassword;
}