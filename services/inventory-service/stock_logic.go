package main

// CanReserve decides whether the requested quantity can be reserved
// given the currently available stock. This is pure logic (no DB, no I/O),
// which makes it easy to test.
func CanReserve(available, requested int) bool {
	if requested <= 0 {
		return false
	}
	return available >= requested
}

// RemainingAfterReserve returns the stock left after reserving.
// Assumes the reservation is valid (call CanReserve first).
func RemainingAfterReserve(available, requested int) int {
	return available - requested
}
