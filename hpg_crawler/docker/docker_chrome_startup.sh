# symlink etc/machine-id for chrome
mv -i /var/lib/dbus/machine-id /etc/ && ln -s /etc/machine-id /var/lib/dbus/
# start chrome
google-chrome