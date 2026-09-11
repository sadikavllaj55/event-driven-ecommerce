package main

import "testing"

func TestCanReserve(t *testing.T) {
	tests := []struct {
		name      string
		available int
		requested int
		want      bool
	}{
		{"enough stock", 10, 3, true},
		{"exact stock", 5, 5, true},
		{"not enough stock", 2, 5, false},
		{"zero available", 0, 1, false},
		{"zero requested", 10, 0, false},
		{"negative requested", 10, -1, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CanReserve(tt.available, tt.requested)
			if got != tt.want {
				t.Errorf("CanReserve(%d, %d) = %v; want %v",
					tt.available, tt.requested, got, tt.want)
			}
		})
	}
}

func TestRemainingAfterReserve(t *testing.T) {
	tests := []struct {
		name      string
		available int
		requested int
		want      int
	}{
		{"reserve some", 10, 3, 7},
		{"reserve all", 5, 5, 0},
		{"reserve one", 8, 1, 7},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := RemainingAfterReserve(tt.available, tt.requested)
			if got != tt.want {
				t.Errorf("RemainingAfterReserve(%d, %d) = %d; want %d",
					tt.available, tt.requested, got, tt.want)
			}
		})
	}
}
