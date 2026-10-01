package main

import "testing"

func TestAliasFromHost(t *testing.T) {
	cases := map[string]string{
		"lumen-0ee1f995.dibbla.app": "lumen-0ee1f995",
		"lumen.dibbla.net":          "lumen",
		"lumen.dibbla.com:443":      "lumen",
		"localhost:8080":            "",
		"www.example.com":           "",
		"a.b.dibbla.app":            "",
		".dibbla.app":               "",
	}
	for host, want := range cases {
		if got := aliasFromHost(host); got != want {
			t.Errorf("aliasFromHost(%q) = %q, want %q", host, got, want)
		}
	}
}
