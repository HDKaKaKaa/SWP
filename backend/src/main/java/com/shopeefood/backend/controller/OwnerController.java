package com.shopeefood.backend.controller;

import com.shopeefood.backend.entity.Owner;
import com.shopeefood.backend.repository.OwnerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/owner")
public class OwnerController {

    @Autowired
    private OwnerRepository ownerRepository;

    // Lấy Owner ID từ Account ID
    @GetMapping("/byAccount/{accountId}")
    public ResponseEntity<?> getOwnerIdByAccount(@PathVariable Integer accountId) {
        Optional<Owner> ownerOpt = ownerRepository.findByAccount_Id(accountId);
        if (ownerOpt.isPresent()) {
            Integer ownerId = ownerOpt.get().getId();
            return ResponseEntity.ok(ownerId); 
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                                 .body("Owner not found for accountId: " + accountId);
        }
    }
}
