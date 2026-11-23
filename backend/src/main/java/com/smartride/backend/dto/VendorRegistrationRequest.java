package com.smartride.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class VendorRegistrationRequest {
    @NotBlank @Size(max = 255)
    private String fullName;
    @NotBlank @Email @Size(max = 255)
    private String email;
    @NotBlank @Pattern(regexp = "^\\s*(?:\\+?91[ -]?)?[6-9](?:[ -]?[0-9]){9}\\s*$")
    private String mobileNumber;
    @NotBlank @Size(max = 72)
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$")
    private String password;
    @NotBlank
    private String confirmPassword;
    @NotBlank @Size(max = 255)
    private String businessName;
    @NotBlank @Size(max = 100)
    private String businessType;
    @NotBlank @Email @Size(max = 255)
    private String businessEmail;
    @NotBlank @Pattern(regexp = "^\\s*(?:\\+?91[ -]?)?[6-9](?:[ -]?[0-9]){9}\\s*$")
    private String businessMobile;
    @NotBlank @Size(max = 1000)
    private String businessAddress;
    @NotBlank @Size(max = 100)
    private String city;
    @NotBlank @Size(max = 100)
    private String state;
    @NotBlank @Pattern(regexp = "^[0-9]{6}$")
    private String pincode;
    @Size(max = 100)
    private String registrationNumber;
    private boolean termsAccepted;
    private boolean vendorPoliciesAccepted;

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getMobileNumber() { return mobileNumber; }
    public void setMobileNumber(String mobileNumber) { this.mobileNumber = mobileNumber; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getConfirmPassword() { return confirmPassword; }
    public void setConfirmPassword(String confirmPassword) { this.confirmPassword = confirmPassword; }
    public String getBusinessName() { return businessName; }
    public void setBusinessName(String businessName) { this.businessName = businessName; }
    public String getBusinessType() { return businessType; }
    public void setBusinessType(String businessType) { this.businessType = businessType; }
    public String getBusinessEmail() { return businessEmail; }
    public void setBusinessEmail(String businessEmail) { this.businessEmail = businessEmail; }
    public String getBusinessMobile() { return businessMobile; }
    public void setBusinessMobile(String businessMobile) { this.businessMobile = businessMobile; }
    public String getBusinessAddress() { return businessAddress; }
    public void setBusinessAddress(String businessAddress) { this.businessAddress = businessAddress; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public String getPincode() { return pincode; }
    public void setPincode(String pincode) { this.pincode = pincode; }
    public String getRegistrationNumber() { return registrationNumber; }
    public void setRegistrationNumber(String registrationNumber) { this.registrationNumber = registrationNumber; }
    public boolean isTermsAccepted() { return termsAccepted; }
    public void setTermsAccepted(boolean termsAccepted) { this.termsAccepted = termsAccepted; }
    public boolean isVendorPoliciesAccepted() { return vendorPoliciesAccepted; }
    public void setVendorPoliciesAccepted(boolean vendorPoliciesAccepted) { this.vendorPoliciesAccepted = vendorPoliciesAccepted; }
}
