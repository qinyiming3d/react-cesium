import React, { useEffect, useState } from 'react';
import { Layout, Dropdown, Button, Typography, Switch, theme, Drawer } from 'antd';
const { useToken } = theme;
import { DownOutlined, UpOutlined, TranslationOutlined, MenuOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import './TopBar.css';

const { Header } = Layout;
const { Title, Text } = Typography;

const TopBar = ({ onThemeChange, isDarkTheme, currentLanguage, onChangeLanguage, isMobile }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [scalarDropdownOpen, setScalarDropdownOpen] = useState(false);
  const [vectorDropdownOpen, setVectorDropdownOpen] = useState(false);
  const { token } = useToken();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    i18n.changeLanguage(currentLanguage);
  }, [currentLanguage, i18n]);

  const scalarItems = [
    { key: '1', label: t('temperature') },
    { key: '2', label: t('salinity') },
    { key: '3', label: t('density') },
  ];

  const vectorItems = [
    { key: '1', label: t('velocity') },
    { key: '2', label: t('direction') },
  ];


  return (
    <Header className="top-bar" style={{ background: token.colorBgBase, color: token.colorTextBase }}>
      <div className="top-bar-content">
        {isMobile ? (
          <>
            <Button
              type="text"
              icon={<MenuOutlined />}
              className="hamburger-menu"
              onClick={() => setDrawerVisible(true)}
            />

            <Drawer
              placement="left"
              onClose={() => setDrawerVisible(false)}
              open={drawerVisible}
              width={220}
              className={'drawer-container'}
            >
              <div className="mobile-menu">
                <Dropdown 
                  menu={{ items: scalarItems }} 
                  trigger={['click']}
                  onOpenChange={(open) => setScalarDropdownOpen(open)}
                >
                  <Button type="text" className="nav-button">
                    {t('scalar')} {scalarDropdownOpen ? <UpOutlined /> : <DownOutlined />}
                  </Button>
                </Dropdown>

                <Dropdown 
                  menu={{ items: vectorItems }} 
                  trigger={['click']}
                  onOpenChange={(open) => setVectorDropdownOpen(open)}
                >
                  <Button type="text" className="nav-button">
                    {t('vector')} {vectorDropdownOpen ? <UpOutlined /> : <DownOutlined />}
                  </Button>
                </Dropdown>

                <div className="mobile-controls">
                  <Text className="author-info">
                    {t('author')}
                  </Text>

                  <Button
                    icon={<TranslationOutlined />}
                    onClick={() => onChangeLanguage()}
                  >
                    {i18n.language === 'en' ? '中文' : 'EN'}
                  </Button>

                  <Switch
                    checkedChildren="🌙"
                    unCheckedChildren="☀️"
                    checked={isDarkTheme}
                    onChange={onThemeChange}
                  />
                </div>
              </div>
            </Drawer>
          </>
        ) : (
          <>
            <div className="nav-items">
              <Dropdown 
                menu={{ items: scalarItems }} 
                trigger={['click']}
                onOpenChange={(open) => setScalarDropdownOpen(open)}
              >
                <Button type="text" className="nav-button">
                  {t('scalar')} {scalarDropdownOpen ? <UpOutlined /> : <DownOutlined />}
                </Button>
              </Dropdown>

              <Dropdown 
                menu={{ items: vectorItems }} 
                trigger={['click']}
                onOpenChange={(open) => setVectorDropdownOpen(open)}
              >
                <Button type="text" className="nav-button">
                  {t('vector')} {vectorDropdownOpen ? <UpOutlined /> : <DownOutlined />}
                </Button>
              </Dropdown>
            </div>
          </>
        )}

        <Title level={3} className="title">
          {t('title')}
        </Title>

        {!isMobile && (
          <div className="right-controls">
            <Text className="author-info">
              {t('author')}
            </Text>

            <Button
              icon={<TranslationOutlined />}
              onClick={() => onChangeLanguage()}
            >
              {i18n.language === 'en' ? '中文' : 'EN'}
            </Button>

            <Switch
              checkedChildren="🌙"
              unCheckedChildren="☀️"
              checked={isDarkTheme}
              onChange={onThemeChange}
            />
          </div>
        )}
      </div>
    </Header>

  );
};

export default TopBar;
