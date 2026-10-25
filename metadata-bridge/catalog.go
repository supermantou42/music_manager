package main

import (
	"fmt"
	"os"
	"strings"

	"github.com/guohuiyuan/music-lib/apple"
	"github.com/guohuiyuan/music-lib/bilibili"
	"github.com/guohuiyuan/music-lib/fivesing"
	"github.com/guohuiyuan/music-lib/jamendo"
	"github.com/guohuiyuan/music-lib/joox"
	"github.com/guohuiyuan/music-lib/kugou"
	"github.com/guohuiyuan/music-lib/kuwo"
	"github.com/guohuiyuan/music-lib/migu"
	"github.com/guohuiyuan/music-lib/model"
	"github.com/guohuiyuan/music-lib/netease"
	"github.com/guohuiyuan/music-lib/provider"
	"github.com/guohuiyuan/music-lib/qianqian"
	"github.com/guohuiyuan/music-lib/qq"
	"github.com/guohuiyuan/music-lib/soda"
)

func musicProvider(source string) (provider.MusicProvider, error) {
	cookie := os.Getenv("MUSIC_" + strings.ToUpper(source) + "_COOKIE")
	switch source {
	case "netease":
		return netease.New(cookie), nil
	case "qq":
		return qq.New(cookie), nil
	case "kugou":
		return kugou.New(cookie), nil
	case "kuwo":
		return kuwo.New(cookie), nil
	case "migu":
		return migu.New(cookie), nil
	case "qianqian":
		return qianqian.New(cookie), nil
	case "soda":
		return soda.New(cookie), nil
	case "fivesing":
		return fivesing.New(cookie), nil
	case "jamendo":
		return jamendo.New(cookie), nil
	case "joox":
		return joox.New(cookie), nil
	case "bilibili":
		return bilibili.New(cookie), nil
	case "apple":
		return apple.New(cookie), nil
	default:
		return nil, fmt.Errorf("unsupported music source")
	}
}

func catalogRequest(r Request) (interface{}, error) {
	client, err := musicProvider(r.Source)
	if err != nil {
		return nil, err
	}
	switch r.Action {
	case "catalog-search":
		query := strings.TrimSpace(r.Query)
		if query == "" || len([]rune(query)) > 200 {
			return nil, fmt.Errorf("invalid search query")
		}
		songs, err := client.Search(query)
		if err != nil {
			return nil, err
		}
		if songs == nil { songs = []model.Song{} }
		limit := r.Limit
		if limit <= 0 || limit > 50 {
			limit = 20
		}
		if len(songs) > limit {
			songs = songs[:limit]
		}
		for i := range songs {
			songs[i].Source = r.Source
		}
		return songs, nil
	case "catalog-resolve":
		if r.Song.ID == "" {
			return nil, fmt.Errorf("song ID is required")
		}
		r.Song.Source = r.Source
		preview := r.Source == "apple"
		var address string
		if s, ok := client.(*soda.Soda); ok {
			info, e := s.GetDownloadInfo(&r.Song)
			if e != nil {
				return nil, e
			}
			if info.PlayAuth != "" {
				return nil, fmt.Errorf("encrypted_stream: this track is not available as a direct audio file")
			}
			address, preview, r.Song.Ext = info.URL, info.Preview, info.Format
		} else {
			address, err = client.GetDownloadURL(&r.Song)
			if err != nil {
				return nil, err
			}
		}
		if address == "" || strings.Contains(address, "#auth=") {
			return nil, fmt.Errorf("no direct audio URL available")
		}
		headers := map[string]string{"User-Agent": "Mozilla/5.0"}
		if r.Source == "bilibili" {
			headers["Referer"] = "https://www.bilibili.com/"
		}
		if r.Source == "qq" {
			headers["Referer"] = "https://y.qq.com/"
		}
		return map[string]interface{}{"url": address, "preview": preview, "ext": r.Song.Ext, "headers": headers}, nil
	}
	return nil, fmt.Errorf("unsupported catalog action")
}
