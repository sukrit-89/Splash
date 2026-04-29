elapsed = min(current_timestamp, end_timestamp) - start_timestamp


total_deposit = rate_per_second * duration_seconds


end_timestamp = start_timestamp + duration_seconds

accrued = elapsed * rate_per_second



claimable = accrued - already_withdrawn
