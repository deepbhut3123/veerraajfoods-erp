import React, { useState, ReactNode, useEffect } from 'react';
import { Layout } from 'antd';
import Navbar from '../DesignLayout/Header';
import FooterEnd from '../DesignLayout/Footer';
import Sidebar from '../DesignLayout/Sidebar';

const { Content } = Layout;

interface MasterProps {
    children: ReactNode;
}



const Master: React.FC<MasterProps> = ({ children }) => {
    //   const [collapsed, setCollapsed] = useState(false);
    //   const [isSmallScreen, setIsSmallScreen] = useState(false);
    const [disableHover, setDisableHover] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [hover, setHover] = useState(false);
    // const [headerName, setHeaderName] = useState('');
    const [isSmallScreen, setIsSmallScreen] = useState(false);
    // const [collapsed, setCollapsed] = useState(false);
    const [hoverEffectActive, setHoverEffectActive] = useState(true); // <- declare first
    // const [isSmallScreen, setIsSmallScreen] = useState(false);

    const handleSidebarItemClick = () => {
        setDisableHover(true);       // This disables hover
        setHoverEffectActive(false); // ALSO disable hover animation effect
        if (isSmallScreen) {
            setCollapsed(true);        // Collapse for small screens
        }
    };
    const handleResize = () => {
        if (window.innerWidth <= 900) {
            setIsSmallScreen(true);
            setCollapsed(false);
        } else {
            setIsSmallScreen(false);
        }
    };

    useEffect(() => {
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);





    const toggleSidebar = () => {
        setCollapsed(!collapsed);
        setDisableHover(false);
    };

    //     }
    // };

    // const handleMouseLeave = () => {
    //     if (hover) {
    //         setCollapsed(true);
    //     }
    // };

    const disableHoverEffect = () => {
        setHover(!hover);
    };

    return (
        <>
            <Layout style={{ minHeight: '100vh' }}>
                <Sidebar
                    collapsed={collapsed}
                    setCollapsed={setCollapsed}
                    onCollapse={toggleSidebar}
                    isSmallScreen={isSmallScreen}
                    disableHover={disableHover}
                    onItemClick={handleSidebarItemClick}
                    hoverEffectActive={hoverEffectActive}
                    setHoverEffectActive={setHoverEffectActive}
                    forceCollapse={true} // 👈 Add this!
                />

                <Layout
                    style={{
                        flex: 1,
                        marginLeft: isSmallScreen ? 0 : (collapsed ? 80 : 200),
                        transition: 'margin-left 0.2s',
                        backgroundColor: '#f0f4f7',
                        overflow: 'hidden'
                    }}
                >
                    <Navbar
                        collapsed={collapsed}
                        toggleSidebar={toggleSidebar}
                        disableHoverEffect={disableHoverEffect}

                    />
                    <Content>
                        {children}
                    </Content>
                    <FooterEnd />
                </Layout>
            </Layout>
        </>
    );
};

export default Master;
