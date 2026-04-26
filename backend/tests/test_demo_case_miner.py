from scripts.mine_demo_cases import mine_demo_cases


def test_demo_case_miner_finds_ranked_demo_buckets() -> None:
    rows = [
        {
            "name": "Clean hospital",
            "address_stateOrRegion": "Bihar",
            "address_city": "Madhepura",
            "address_zipOrPostcode": "852113",
            "description": "LSCS with OT 24x7 and anesthesiologist",
            "equipment": '["anesthesia machine", "operation theatre", "baby warmer"]',
            "procedure": '["LSCS"]',
            "capability": '["emergency obstetric care"]',
            "latitude": "25.92",
            "longitude": "86.79",
        },
        {
            "name": "Suspicious surgery centre",
            "address_stateOrRegion": "Bihar",
            "address_city": "Madhepura",
            "address_zipOrPostcode": "852114",
            "description": "Advanced surgery claimed. No anesthesia machine.",
            "equipment": "[]",
            "procedure": '["advanced surgery"]',
            "capability": '["advanced surgery"]',
            "latitude": "25.93",
            "longitude": "86.8",
        },
    ]

    mined = mine_demo_cases(rows)

    assert mined["clean_win"][0]["name"] == "Clean hospital"
    assert mined["live_catch"][0]["name"] == "Suspicious surgery centre"
    assert mined["madhepura_geo"][0]["name"] in {"Clean hospital", "Suspicious surgery centre"}
