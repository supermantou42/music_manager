package main

import "testing"

func TestCatalogProviderRegistry(t *testing.T) {
	for _, name := range []string{"netease", "qq", "kugou", "kuwo", "migu", "qianqian", "soda", "fivesing", "jamendo", "joox", "bilibili", "apple"} {
		if _, err := musicProvider(name); err != nil {
			t.Fatalf("%s: %v", name, err)
		}
	}
	if _, err := musicProvider("unknown"); err == nil {
		t.Fatal("unknown sources must fail")
	}
	if _, err := catalogRequest(Request{Action: "catalog-search", Source: "qq", Query: " "}); err == nil {
		t.Fatal("empty queries must fail before network access")
	}
	if _, err := catalogRequest(Request{Action: "catalog-resolve", Source: "qq"}); err == nil {
		t.Fatal("missing IDs must fail before network access")
	}
}
