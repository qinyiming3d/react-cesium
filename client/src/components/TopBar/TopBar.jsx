import React, { useEffect, useState } from 'react';
import { Layout, Dropdown, Button, Typography, Switch, theme, Drawer, Space } from 'antd';
import { Link } from 'react-router-dom';
import { DownOutlined, UpOutlined, TranslationOutlined, MenuOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import styles from './index.module.scss';

const { Header } = Layout;
const { Title, Text } = Typography;
const { useToken } = theme;

const TopBar = ({ onThemeChange, isDarkTheme, currentLanguage, onChangeLanguage, isMobile }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [scalarDropdownOpen, setScalarDropdownOpen] = useState(false);
  const [vectorDropdownOpen, setVectorDropdownOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const { token } = useToken();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    i18n.changeLanguage(currentLanguage);
  }, [currentLanguage, i18n]);

  const scalarItems = [
    { key: 'nc', label: <Link to="/scalar/ncFile">{t('ncFile')}</Link> },
    { key: 'salinity', label: <Link to="/scalar/salinity">{t('salinity')}</Link> },
    { key: 'density', label: <Link to="/scalar/density">{t('density')}</Link> },
  ];

  const vectorItems = [
    { key: 'velocity', label: <Link to="/vector/velocity">{t('velocity')}</Link> },
    { key: 'direction', label: <Link to="/vector/direction">{t('direction')}</Link> },
  ];


  return (
    <Header className={styles.topBar} style={{ background: token.colorBgBase, color: token.colorTextBase }}>
      <div className={styles.topBarContent}>
        {isMobile ? (
          <>
            <Button
              type="text"
              icon={<MenuOutlined />}
              className={styles.hamburgerMenu}
              onClick={() => setDrawerVisible(true)}
            />

            <Drawer
              placement="left"
              onClose={() => setDrawerVisible(false)}
              open={drawerVisible}
              width={220}
            >
              <div className={styles.mobileMenu}>
                <Dropdown
                  menu={{ 
                    items: scalarItems,
                    selectedKeys: selectedItem?.type === 'scalar' ? [selectedItem.key] : [],
                    onClick: (e) => {
                      setSelectedItem({ type: 'scalar', key: e.key });
                    }
                  }}
                  trigger={['click']}
                  onOpenChange={(open) => setScalarDropdownOpen(open)}
                >
                <Button type="text" className={styles.navButton}>
                    {t('scalar')} {scalarDropdownOpen ? <UpOutlined /> : <DownOutlined />}
                  </Button>
                </Dropdown>

                <Dropdown
                  menu={{ 
                    items: vectorItems,
                    selectedKeys: selectedItem?.type === 'vector' ? [selectedItem.key] : [],
                    onClick: (e) => {
                      setSelectedItem({ type: 'vector', key: e.key });
                    }
                  }}
                  trigger={['click']}
                  onOpenChange={(open) => setVectorDropdownOpen(open)}
                >
                <Button type="text" className={styles.navButton}>
                    {t('vector')} {vectorDropdownOpen ? <UpOutlined /> : <DownOutlined />}
                  </Button>
                </Dropdown>

                <div className={styles.mobileControls}>
                  <Text className={styles.authorInfo}>
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
            <div className={styles.navItems}>
              <Dropdown
                menu={{
                  items: scalarItems,
                  selectable: true,
                  selectedKeys: selectedItem?.type === 'scalar' ? [selectedItem.key] : [],
                  onClick: (e) => {
                    setSelectedItem({ type: 'scalar', key: e.key });
                  }
                }}
                trigger={['click']}
                onOpenChange={(open) => setScalarDropdownOpen(open)}
              >
                <div>
                  {t('scalar')}
                  <span className={styles.icon}>{scalarDropdownOpen ? <UpOutlined /> : <DownOutlined />}</span>
                </div>

              </Dropdown>

              <Dropdown
                menu={{
                  items: vectorItems,
                  selectable: true,
                  selectedKeys: selectedItem?.type === 'vector' ? [selectedItem.key] : [],
                  onClick: (e) => {
                    setSelectedItem({ type: 'vector', key: e.key });
                  }
                }}
                trigger={['click']}
                onOpenChange={(open) => setVectorDropdownOpen(open)}
              >
                <div>
                  {t('vector')}
                  <span className={styles.icon}>{vectorDropdownOpen ? <UpOutlined /> : <DownOutlined />}</span>
                </div>

              </Dropdown>
            </div>
          </>
        )}

        <Title level={3} className={styles.title}>
          {t('title')}
        </Title>

        {!isMobile && (
            <div className={styles.rightControls}>
              <Text className={styles.authorInfo}>
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
