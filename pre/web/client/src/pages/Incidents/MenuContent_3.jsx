// page/MainContent_3.js
import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { FaRegEye } from "react-icons/fa";
import axios from "axios";


import "./MainContent.css";

function MenuContent_3() {
    const [incidents, setIncidents] = useState([]);
    const [activeCategory, setActiveCategory] = useState("전체"); // 현재 활성화된 탭 (카테고리) 관리 state
    const [searchTerm, setSearchTerm] = useState(''); // 검색어 state

    const [selectedSortOrder, setSelectedSortOrder] = useState('newest'); // 정렬 옵션 state ('newest' 또는 'oldest')

    const [filteredItems, setFilteredItems] = useState([]); // 최종적으로 화면에 보여질 아이템 리스트 state

    // ✨ 스크롤을 조작할 DOM 요소에 대한 ref 생성
    const camContainerRef = useRef(null);

    useEffect(() => {
        const fetchIncidents = async () => {
            try {
                const response = await axios.get("http://localhost:5000/user/incidents");
                setIncidents(response.data.incidents);
            } catch (error) {
                console.error("Error fetching incidents:", error);
            }
        };

        fetchIncidents();
    }, []);

    const handleSortChange = (event) => {
        setSelectedSortOrder(event.target.value); // 선택된 값으로 상태 업데이트
        console.log("선택된 정렬 순서:", event.target.value);
        // 여기에 정렬 로직을 추가하거나, 상위 컴포넌트로 변경된 정렬 상태를 전달할 수도 있어.
    };

    // 정렬 옵션 데이터 (const로 한 번만 선언!)
    const sortOptions = [
        { name: "최근 순", value: "newest" },
        { name: "오래된 순", value: "oldest" }
    ];

    // 탭 제목들 (const로 한 번만 선언!)
    const tabTitles = [
        "전체", "교통약자", "방화", "절도", "전도", "유기", "파손", "화재", "흡연"
    ];

    // ✨ 이미지 다운로드 처리 함수 추가!
    const handleDownload = (imageUrl, imageName) => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = imageName || 'image_download';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // 검색어 입력 핸들러 (const로 한 번만 선언!)
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        if (camContainerRef.current) {
             camContainerRef.current.scrollTop = 0;
        }
    };

    // 탭 클릭 핸들러 (const로 한 번만 선언!)
    const handleTabClick = (category) => {
        setActiveCategory(category);
        setSearchTerm('');
        if (camContainerRef.current) {
            camContainerRef.current.scrollTop = 0;
        }
    };

    // 탭, 검색어, 정렬 옵션 변경 시 필터링 및 정렬 로직 실행
    useEffect(() => {

        let currentItems = incidents.map(incident => ({
            id: incident.incidents_id,
            name: incident.camera,
            time: new Date(incident.date).toLocaleString('ko-KR'),
            category: incident.type,
            imageUrl: `http://localhost:5000/${incident.image_path}`
        }));

        // 1. 정렬 적용
        currentItems.sort((a, b) => {
            const dateA = new Date(a.time.replace(' / ', 'T'));
            const dateB = new Date(b.time.replace(' / ', 'T'));
            return selectedSortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

        // 2. 카테고리 필터링
        if (activeCategory !== "전체") {
            currentItems = currentItems.filter(item =>
                item.category.toLowerCase() === activeCategory.toLowerCase()
            );
        }

        // 3. 검색어 필터링 (이름, 카테고리, 날짜)
        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            currentItems = currentItems.filter(item => {
                const itemDatePart = item.time.split(' ')[0];
                return (
                    item.name.toLowerCase().includes(lowerCaseSearchTerm) ||
                    item.category.toLowerCase().includes(lowerCaseSearchTerm) ||
                    itemDatePart.includes(lowerCaseSearchTerm)
                );
            });
        }

        setFilteredItems(currentItems); // 필터링 및 정렬된 결과로 state 업데이트
    }, [incidents, activeCategory, searchTerm, selectedSortOrder]); // 의존성 배열도 잘 확인!

    // ✨ 컴포넌트의 반환 부분은 항상 함수의 제일 마지막에 와야 해!
    return (
        <div className="content">
            <h2 className="tit"><FaRegEye />All Incidents</h2>

            {/* --- 정렬 드롭다운 UI (기존 패밀리 사이트 자리에) --- */}
            <div className="sort_wrapper"> {/* 새로운 CSS 클래스 이름 */}
                <select
                    value={selectedSortOrder}
                    onChange={handleSortChange}
                    className="sort_select" // 새로운 CSS 클래스 이름
                >
                    {sortOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.name}</option>
                    ))}
                </select>
            </div>

            {/* --- 검색창 UI --- */}
            <div className="search_wrapper">
                <FontAwesomeIcon icon={faSearch} className="search_input_icon" />
                <input
                    type="text"
                    className="search_input_field"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    placeholder="검색어를 입력하세요."
                />
            </div>

            {/* --- 탭 버튼 UI --- */}
            <div className="tab_container">
                <div className="tab_buttons_wrapper">
                    {tabTitles.map((title) => (
                        <button
                            key={title}
                            className={`tab_button ${activeCategory === title ? 'active' : ''}`}
                            onClick={() => handleTabClick(title)}
                        >
                            {title}
                        </button>
                    ))}
                </div>
            </div>

            {/* --- 검색 결과 리스트 UI --- */}
            <div className="cam_container" ref={camContainerRef}>
                {filteredItems.length > 0 ? (
                    <ul>
                        {filteredItems.map(item => (
                            <li key={item.id}>
                                <img src={item.imageUrl} alt="Captured Camera thumbnail"/>
                                <p className="tit">{item.name}</p>
                                <p className="txt">{item.time} ({item.category})</p>
                                <button onClick={() => handleDownload(item.imageUrl,`${item.name}.webp`)}>이미지 다운로드</button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="no-results">
                        {searchTerm ? `'${searchTerm}'에 대한 검색 결과가 없습니다.` :
                         `선택된 카테고리 '${activeCategory}'에 해당하는 항목이 없습니다.`}
                    </p>
                )}
            </div>
        </div>
    );
};

export default MenuContent_3;